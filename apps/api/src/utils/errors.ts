export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
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

export function badRequest(code: string, message: string): AppError {
  return new AppError(code, message, 400);
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
