import { MiddlewareHandler } from 'hono';
import { AppError } from './error-handler';

// Simple in-memory rate limiter (for production, use Redis)
const requests = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  maxRequests: number = 100,
  windowMs: number = 60000
): MiddlewareHandler {
  return async (c, next) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const key = `${ip}`;

    const now = Date.now();
    const record = requests.get(key);

    if (!record || now > record.resetAt) {
      requests.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
    } else {
      record.count++;

      if (record.count > maxRequests) {
        const resetIn = Math.ceil((record.resetAt - now) / 1000);
        throw new AppError(
          'RATE_LIMIT_EXCEEDED',
          `Too many requests. Try again in ${resetIn} seconds`,
          429,
          { resetIn }
        );
      }
    }

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      for (const [k, v] of requests.entries()) {
        if (now > v.resetAt) {
          requests.delete(k);
        }
      }
    }

    await next();
  };
}
