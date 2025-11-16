import { MiddlewareHandler } from 'hono';
import { ZodSchema } from 'zod';

export function validateBody(schema: ZodSchema): MiddlewareHandler {
  return async (c, next) => {
    const body = await c.req.json();
    const validated = schema.parse(body);
    c.set('validatedBody', validated);
    await next();
  };
}

export function validateQuery(schema: ZodSchema): MiddlewareHandler {
  return async (c, next) => {
    const query = c.req.query();
    const validated = schema.parse(query);
    c.set('validatedQuery', validated);
    await next();
  };
}

export function validateParams(schema: ZodSchema): MiddlewareHandler {
  return async (c, next) => {
    const params = c.req.param();
    const validated = schema.parse(params);
    c.set('validatedParams', validated);
    await next();
  };
}
