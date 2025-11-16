import { MiddlewareHandler } from 'hono';
import { nanoid } from 'nanoid';

export function requestId(): MiddlewareHandler {
  return async (c, next) => {
    const id = c.req.header('X-Request-ID') || nanoid();
    c.set('requestId', id);
    c.header('X-Request-ID', id);
    await next();
  };
}
