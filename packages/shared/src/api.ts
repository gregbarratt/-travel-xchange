export type SharedApiError = {
  code?: string;
  message: string;
};

export type SharedApiResult<TData> =
  | {
      data: TData;
      error: null;
      ok: true;
    }
  | {
      data: null;
      error: SharedApiError;
      ok: false;
    };

export type SharedPaginatedResult<TItem> = {
  items: TItem[];
  nextCursor: string | null;
};

export function sharedApiSuccess<TData>(data: TData): SharedApiResult<TData> {
  return {
    data,
    error: null,
    ok: true,
  };
}

export function sharedApiFailure<TData = never>(
  message: string,
  code?: string,
): SharedApiResult<TData> {
  return {
    data: null,
    error: {
      code,
      message,
    },
    ok: false,
  };
}
