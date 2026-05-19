export type TravelXchangeApiClientOptions = {
  baseUrl: string;
  fetcher?: typeof fetch;
  getAccessToken?: () => Promise<string | null> | string | null;
};

export type TravelXchangeApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export type TravelXchangeApiResponse<TData> =
  | {
      data: TData;
      error: null;
      ok: true;
    }
  | {
      data: null;
      error: string;
      ok: false;
    };

export type TravelXchangeApiClient = ReturnType<typeof createTravelXchangeApiClient>;

export function createTravelXchangeApiClient({
  baseUrl,
  fetcher = fetch,
  getAccessToken,
}: TravelXchangeApiClientOptions) {
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");

  async function request<TData>(
    path: string,
    options: TravelXchangeApiRequestOptions = {},
  ): Promise<TravelXchangeApiResponse<TData>> {
    const headers = new Headers(options.headers);

    headers.set("Accept", "application/json");

    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    const accessToken =
      typeof getAccessToken === "function"
        ? await getAccessToken()
        : getAccessToken;

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    try {
      const response = await fetcher(`${cleanBaseUrl}${path}`, {
        ...options,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        headers,
      });

      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? ((await response.json()) as unknown)
        : null;

      if (!response.ok) {
        return {
          data: null,
          error:
            getErrorMessage(payload) ||
            `Travel Xchange request failed with status ${response.status}.`,
          ok: false,
        };
      }

      return {
        data: payload as TData,
        error: null,
        ok: true,
      };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Travel Xchange request failed.",
        ok: false,
      };
    }
  }

  return {
    delete: <TData>(path: string, options?: TravelXchangeApiRequestOptions) =>
      request<TData>(path, { ...options, method: "DELETE" }),
    get: <TData>(path: string, options?: TravelXchangeApiRequestOptions) =>
      request<TData>(path, { ...options, method: "GET" }),
    patch: <TData>(
      path: string,
      body: unknown,
      options?: TravelXchangeApiRequestOptions,
    ) => request<TData>(path, { ...options, body, method: "PATCH" }),
    post: <TData>(
      path: string,
      body: unknown,
      options?: TravelXchangeApiRequestOptions,
    ) => request<TData>(path, { ...options, body, method: "POST" }),
    request,
  };
}

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if ("error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  if ("message" in payload && typeof payload.message === "string") {
    return payload.message;
  }

  return null;
}
