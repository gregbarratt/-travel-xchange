import { lookup } from "node:dns/promises";

import { assertSafeFetchUrl, isPrivateIpAddress, UnsafeUrlError } from "./url.ts";

/**
 * HTTP transport for feed polling.
 *
 * Everything here exists because the URL being requested was configured by a
 * person and the response is served by someone else's server: conditional
 * requests to stay polite, a hard timeout and size cap so one slow publisher
 * cannot hold the ingestion run open, redirects re-validated hop by hop so a
 * redirect cannot walk the worker onto a private address, and retries only on
 * the failures that are worth retrying.
 */

export type FeedFetchRequest = {
  url: string;
  etag?: string | null;
  lastModified?: string | null;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  attempts?: number;
  /** Injected in tests. Defaults to the platform fetch. */
  fetchImpl?: typeof fetch;
  /** Injected in tests. Defaults to a real DNS lookup. */
  resolveHostname?: (hostname: string) => Promise<string[]>;
};

export type FeedFetchResult =
  | {
      status: "ok";
      httpStatus: number;
      body: string;
      etag: string | null;
      lastModified: string | null;
      finalUrl: string;
      contentType: string | null;
    }
  | {
      status: "not_modified";
      httpStatus: number;
      finalUrl: string;
    }
  | {
      status: "failed";
      httpStatus: number | null;
      error: string;
      retryable: boolean;
    };

const defaultTimeoutMs = 15_000;
const defaultMaxBytes = 5 * 1024 * 1024;
const defaultMaxRedirects = 3;
const defaultAttempts = 3;

const userAgent =
  "TravelXchangeNewsBot/1.0 (+https://www.travelxchange.co.uk; trade news aggregation)";

async function defaultResolveHostname(hostname: string) {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

/**
 * Resolves the hostname and rejects it if any address is private.
 *
 * The URL-level check cannot catch a public hostname that resolves to
 * 127.0.0.1 or a cloud metadata address, which is the usual shape of an SSRF
 * attempt against a feed reader.
 */
async function assertPublicHostname(
  hostname: string,
  resolveHostname: (hostname: string) => Promise<string[]>,
) {
  let addresses: string[];

  try {
    addresses = await resolveHostname(hostname);
  } catch {
    throw new UnsafeUrlError(`The hostname ${hostname} could not be resolved.`);
  }

  if (addresses.length === 0) {
    throw new UnsafeUrlError(`The hostname ${hostname} did not resolve to any address.`);
  }

  const blocked = addresses.find((address) => isPrivateIpAddress(address));

  if (blocked) {
    throw new UnsafeUrlError(
      `The hostname ${hostname} resolves to a private address and will not be fetched.`,
    );
  }
}

async function readBodyWithLimit(response: Response, maxBytes: number) {
  const declaredLength = Number.parseInt(response.headers.get("content-length") ?? "", 10);

  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error(
      `The feed response declares ${declaredLength} bytes, above the ${maxBytes} byte limit.`,
    );
  }

  if (!response.body) {
    const text = await response.text();

    if (text.length > maxBytes) {
      throw new Error(`The feed response exceeded the ${maxBytes} byte limit.`);
    }

    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      received += value.byteLength;

      if (received > maxBytes) {
        throw new Error(`The feed response exceeded the ${maxBytes} byte limit.`);
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(received);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

async function fetchOnce(
  request: FeedFetchRequest,
  timeoutMs: number,
  maxBytes: number,
  maxRedirects: number,
): Promise<FeedFetchResult> {
  const fetchImpl = request.fetchImpl ?? fetch;
  const resolveHostname = request.resolveHostname ?? defaultResolveHostname;

  let currentUrl = request.url;

  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    const url = assertSafeFetchUrl(currentUrl);
    await assertPublicHostname(url.hostname, resolveHostname);

    const headers: Record<string, string> = {
      accept:
        "application/rss+xml, application/atom+xml, application/xml, application/feed+json, text/xml;q=0.9, application/json;q=0.8, */*;q=0.5",
      "accept-encoding": "gzip, deflate",
      "user-agent": userAgent,
    };

    // Conditional request: a publisher that supports these returns 304 and
    // costs both sides nothing.
    if (redirect === 0 && request.etag) {
      headers["if-none-match"] = request.etag;
    }

    if (redirect === 0 && request.lastModified) {
      headers["if-modified-since"] = request.lastModified;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;

    try {
      response = await fetchImpl(url.toString(), {
        headers,
        // Redirects are followed by hand so each hop is re-validated.
        redirect: "manual",
        signal: controller.signal,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? `The feed did not respond within ${timeoutMs}ms.`
          : error instanceof Error
            ? error.message
            : "The feed request failed.";

      return { error: message, httpStatus: null, retryable: true, status: "failed" };
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 304) {
      return { finalUrl: url.toString(), httpStatus: 304, status: "not_modified" };
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");

      if (!location) {
        return {
          error: `The feed returned ${response.status} without a Location header.`,
          httpStatus: response.status,
          retryable: false,
          status: "failed",
        };
      }

      currentUrl = new URL(location, url).toString();
      continue;
    }

    if (!response.ok) {
      return {
        error: `The feed returned HTTP ${response.status}.`,
        httpStatus: response.status,
        retryable: isRetryableStatus(response.status),
        status: "failed",
      };
    }

    try {
      const body = await readBodyWithLimit(response, maxBytes);

      return {
        body,
        contentType: response.headers.get("content-type"),
        etag: response.headers.get("etag"),
        finalUrl: url.toString(),
        httpStatus: response.status,
        lastModified: response.headers.get("last-modified"),
        status: "ok",
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "The feed body could not be read.",
        httpStatus: response.status,
        retryable: false,
        status: "failed",
      };
    }
  }

  return {
    error: `The feed redirected more than ${maxRedirects} times.`,
    httpStatus: null,
    retryable: false,
    status: "failed",
  };
}

/**
 * Fetches a feed, retrying transient failures with a widening delay.
 *
 * An unsafe URL is never retried: it will not become safe.
 */
export async function fetchFeed(request: FeedFetchRequest): Promise<FeedFetchResult> {
  const timeoutMs = request.timeoutMs ?? defaultTimeoutMs;
  const maxBytes = request.maxBytes ?? defaultMaxBytes;
  const maxRedirects = request.maxRedirects ?? defaultMaxRedirects;
  const attempts = Math.max(1, request.attempts ?? defaultAttempts);

  let lastResult: FeedFetchResult | null = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await fetchOnce(request, timeoutMs, maxBytes, maxRedirects);

      if (result.status !== "failed" || !result.retryable) {
        return result;
      }

      lastResult = result;
    } catch (error) {
      if (error instanceof UnsafeUrlError) {
        return {
          error: error.message,
          httpStatus: null,
          retryable: false,
          status: "failed",
        };
      }

      lastResult = {
        error: error instanceof Error ? error.message : "The feed request failed.",
        httpStatus: null,
        retryable: true,
        status: "failed",
      };
    }

    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
    }
  }

  return (
    lastResult ?? {
      error: "The feed request failed.",
      httpStatus: null,
      retryable: false,
      status: "failed",
    }
  );
}
