export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, statusCode: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

export function notFound(message = 'Resource not found'): AppError {
  return new AppError('NOT_FOUND', message, 404);
}

export function forbidden(message = 'Forbidden'): AppError {
  return new AppError('FORBIDDEN', message, 403);
}

export function unauthorized(message = 'Unauthorized'): AppError {
  return new AppError('UNAUTHORIZED', message, 401);
}

export function badRequest(code: string, message: string, details?: Record<string, unknown>): AppError {
  return new AppError(code, message, 400, details);
}

export function conflict(code: string, message: string): AppError {
  return new AppError(code, message, 409);
}

export function gone(code: string, message: string): AppError {
  return new AppError(code, message, 410);
}

export function rateLimited(message = 'Too many requests'): AppError {
  return new AppError('RATE_LIMITED', message, 429);
}
