export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
  requestId: string;
};

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId: string;

  constructor(status: number, error: ApiErrorBody) {
    super(error.message);
    this.status = status;
    this.code = error.code;
    this.details = error.details;
    this.requestId = error.requestId;
  }
}

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

const LOGIN_PATH = '/api/auth/login';

export async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    let errorBody: ApiErrorBody;
    try {
      const body = (await response.json()) as { error: ApiErrorBody };
      errorBody = body.error;
    } catch {
      errorBody = { code: 'INTERNAL', message: 'Noe gikk galt', requestId: '' };
    }

    if (response.status === 401 && path !== LOGIN_PATH) {
      onUnauthorized?.();
    }

    throw new ApiRequestError(response.status, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
