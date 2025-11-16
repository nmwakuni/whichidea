import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, c: Context) {
  console.error('Error:', err);

  // Handle Hono HTTP exceptions
  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: {
          code: 'HTTP_ERROR',
          message: err.message,
        },
      },
      err.status
    );
  }

  // Handle custom app errors
  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      },
      err.statusCode
    );
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: err.errors,
        },
      },
      400
    );
  }

  // Handle unknown errors
  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message:
          process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
      },
    },
    500
  );
}
