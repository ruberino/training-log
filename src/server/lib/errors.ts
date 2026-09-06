export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  readonly details: unknown;

  constructor(message = 'Ugyldig forespørsel', details?: unknown) {
    super(400, 'VALIDATION_ERROR', message);
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Ikke innlogget') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Finnes ikke') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

export class RateLimitedError extends AppError {
  constructor(message = 'For mange forsøk. Prøv igjen om et minutt.') {
    super(429, 'RATE_LIMITED', message);
  }
}

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
  };
};

export function toErrorResponse(error: unknown, requestId: string): ApiErrorBody {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        ...(error instanceof ValidationError ? { details: error.details } : {}),
        requestId,
      },
    };
  }

  return {
    error: {
      code: 'INTERNAL',
      message: 'Noe gikk galt',
      requestId,
    },
  };
}
