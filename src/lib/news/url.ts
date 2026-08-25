import { createHash } from "node:crypto";

/**
 * URL handling for untrusted feed content.
 *
 * Two jobs live here. The first is deduplication: publishers hand out the same
 * story through tracking URLs, mixed casing and stray fragments, so a URL is
 * reduced to a canonical form before it is compared. The second is egress
 * safety: an ingestion worker follows URLs supplied by a third party, so it
 * must never be talked into fetching a private or link-local address.
 */

/** Query parameters that identify a campaign, not a document. */
const trackingParameterPrefixes = ["utm_", "pk_", "mtm_", "matomo_", "hsa_", "vero_"];

const trackingParameterNames = new Set([
  "cmpid",
  "ehid",
  "fbclid",
  "gclid",
  "gbraid",
  "icid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "mkt_tok",
  "msclkid",
  "ncid",
  "ref",
  "ref_src",
  "s_cid",
  "sc_campaign",
  "sc_channel",
  "spm",
  "trk",
  "twclid",
  "wbraid",
  "wt_mc",
  "yclid",
]);

const blockedHostnames = new Set([
  "0.0.0.0",
  "broadcasthost",
  "instance-data",
  "localhost",
  "metadata",
  "metadata.google.internal",
]);

const blockedHostnameSuffixes = [".internal", ".local", ".localdomain", ".localhost"];

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

function isTrackingParameter(name: string) {
  const lower = name.toLowerCase();

  return (
    trackingParameterNames.has(lower) ||
    trackingParameterPrefixes.some((prefix) => lower.startsWith(prefix))
  );
}

function parseIpv4(hostname: string) {
  const parts = hostname.split(".");

  if (parts.length !== 4) {
    return null;
  }

  const octets = parts.map((part) => {
    if (!/^\d{1,3}$/.test(part)) {
      return Number.NaN;
    }

    return Number.parseInt(part, 10);
  });

  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null;
  }

  return octets;
}

/**
 * True for any address an ingestion worker must never reach: loopback,
 * private ranges, link-local (including the cloud metadata address),
 * carrier-grade NAT, broadcast and reserved space.
 */
export function isPrivateIpAddress(address: string) {
  const host = address.trim().replace(/^\[|\]$/g, "").toLowerCase();
  const ipv4 = parseIpv4(host);

  if (ipv4) {
    const [a, b] = ipv4;

    if (a === 0 || a === 10 || a === 127) {
      return true;
    }

    if (a === 169 && b === 254) {
      return true;
    }

    if (a === 172 && b >= 16 && b <= 31) {
      return true;
    }

    if (a === 192 && b === 168) {
      return true;
    }

    if (a === 100 && b >= 64 && b <= 127) {
      return true;
    }

    if (a === 192 && b === 0) {
      return true;
    }

    if (a >= 224) {
      return true;
    }

    return false;
  }

  if (!host.includes(":")) {
    return false;
  }

  // IPv6.
  if (host === "::" || host === "::1") {
    return true;
  }

  // IPv4-mapped and IPv4-compatible addresses carry an embedded v4 address.
  const embedded = host.match(/((\d{1,3}\.){3}\d{1,3})$/);

  if (embedded) {
    return isPrivateIpAddress(embedded[1]);
  }

  // Unique local (fc00::/7) and link-local (fe80::/10).
  return /^f[cd]/.test(host) || /^fe[89ab]/.test(host);
}

/** True when a hostname must not be resolved at all. */
export function isBlockedHostname(hostname: string) {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");

  if (!host) {
    return true;
  }

  if (blockedHostnames.has(host)) {
    return true;
  }

  if (blockedHostnameSuffixes.some((suffix) => host.endsWith(suffix))) {
    return true;
  }

  return isPrivateIpAddress(host);
}

/**
 * Validates a URL the ingestion worker is about to request.
 *
 * Hostname resolution is checked separately by the fetcher; this covers the
 * checks that can be made from the URL alone.
 */
export function assertSafeFetchUrl(rawUrl: string) {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("The feed URL is not a valid absolute URL.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new UnsafeUrlError(
      `The feed URL uses an unsupported scheme (${url.protocol.replace(":", "")}). Only http and https are allowed.`,
    );
  }

  if (url.username || url.password) {
    throw new UnsafeUrlError("The feed URL must not embed credentials.");
  }

  if (isBlockedHostname(url.hostname)) {
    throw new UnsafeUrlError(
      "The feed URL points at a private, loopback or link-local address.",
    );
  }

  return url;
}

/** Non-throwing form of {@link assertSafeFetchUrl}. */
export function isSafeFetchUrl(rawUrl: string) {
  try {
    assertSafeFetchUrl(rawUrl);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reduces a URL to the form used for comparison and storage:
 * https preferred, host lower-cased, default port dropped, tracking
 * parameters removed, remaining parameters sorted, fragment dropped.
 */
export function canonicaliseUrl(rawUrl: string, baseUrl?: string) {
  let url: URL;

  try {
    url = baseUrl ? new URL(rawUrl, baseUrl) : new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }

  url.hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  url.hash = "";
  url.username = "";
  url.password = "";

  if (
    (url.protocol === "https:" && url.port === "443") ||
    (url.protocol === "http:" && url.port === "80")
  ) {
    url.port = "";
  }

  const kept = [...url.searchParams.entries()].filter(([name]) => !isTrackingParameter(name));
  kept.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  url.search = "";

  for (const [name, value] of kept) {
    url.searchParams.append(name, value);
  }

  // A trailing slash on a path is not a different document.
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
}

/** Stable hash of a canonical URL, used as the deduplication key. */
export function hashCanonicalUrl(canonicalUrl: string) {
  return createHash("sha256").update(canonicalUrl).digest("hex");
}

/**
 * Fingerprint of a headline, used to spot the same story arriving from a
 * second publisher. Punctuation, casing, common wire prefixes and stop words
 * are removed so that "BA cancels flights" and "BA Cancels Flights - Update"
 * collapse to the same value.
 */
export function titleFingerprint(title: string) {
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "as",
    "at",
    "by",
    "for",
    "from",
    "in",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
  ]);

  const normalised = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0 && !stopWords.has(word))
    .join(" ");

  return createHash("sha256").update(normalised).digest("hex");
}
