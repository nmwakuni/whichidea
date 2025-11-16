import { MiddlewareHandler } from 'hono';
import { verify } from 'jsonwebtoken';
import { AppError } from './error-handler';
import { db, users } from '@savegame/database';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface JWTPayload {
  userId: string;
  organizationId: string;
  role: string;
}

export function authenticate(): MiddlewareHandler {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('UNAUTHORIZED', 'Missing or invalid authorization header', 401);
    }

    const token = authHeader.substring(7);

    try {
      const payload = verify(token, JWT_SECRET) as JWTPayload;

      // Fetch user to ensure they still exist and are active
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user || user.deletedAt) {
        throw new AppError('UNAUTHORIZED', 'User not found or inactive', 401);
      }

      // Set user context
      c.set('userId', payload.userId);
      c.set('organizationId', payload.organizationId);
      c.set('userRole', payload.role);
      c.set('user', user);

      await next();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('UNAUTHORIZED', 'Invalid or expired token', 401);
    }
  };
}

export function requireRole(...roles: string[]): MiddlewareHandler {
  return async (c, next) => {
    const userRole = c.get('userRole');

    if (!userRole || !roles.includes(userRole)) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions', 403);
    }

    await next();
  };
}

export function requireOrganization(): MiddlewareHandler {
  return async (c, next) => {
    const organizationId = c.get('organizationId');

    if (!organizationId) {
      throw new AppError('FORBIDDEN', 'Organization context required', 403);
    }

    await next();
  };
}
