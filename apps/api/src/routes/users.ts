import { Hono } from 'hono';
import { db, users, organizations } from '@savegame/database';
import { eq, and, ilike, desc, or, sql } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';
import { createUserSchema, updateUserSchema, paginationSchema } from '@savegame/shared';
import { formatPhoneNumber } from '@savegame/shared';

const userRoutes = new Hono();

// All routes require authentication
userRoutes.use('*', authenticate());

// List users (admins only)
userRoutes.get('/', requireRole('org_admin'), validateQuery(paginationSchema), async (c) => {
  const organizationId = c.get('organizationId');
  const { page, pageSize } = c.get('validatedQuery');
  const query = c.req.query('search');

  const offset = (page - 1) * pageSize;

  let queryBuilder = db
    .select()
    .from(users)
    .where(
      and(
        eq(users.organizationId, organizationId),
        eq(users.deletedAt, null)
      )
    );

  if (query) {
    queryBuilder = queryBuilder.where(
      or(
        ilike(users.firstName, `%${query}%`),
        ilike(users.lastName, `%${query}%`),
        ilike(users.phoneNumber, `%${query}%`)
      )
    );
  }

  const [data, count] = await Promise.all([
    queryBuilder
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(
        and(
          eq(users.organizationId, organizationId),
          eq(users.deletedAt, null)
        )
      ),
  ]);

  const total = Number(count[0]?.count || 0);

  return c.json({
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasMore: page * pageSize < total,
    },
  });
});

// Create user (admin only)
userRoutes.post('/', requireRole('org_admin'), validateBody(createUserSchema), async (c) => {
  const organizationId = c.get('organizationId');
  const userData = c.get('validatedBody');

  const formattedPhone = formatPhoneNumber(userData.phoneNumber);

  // Check if user already exists
  const [existing] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.phoneNumber, formattedPhone),
        eq(users.organizationId, organizationId)
      )
    )
    .limit(1);

  if (existing && !existing.deletedAt) {
    throw new AppError('DUPLICATE_ENTRY', 'User with this phone number already exists', 400);
  }

  // Create user
  const [newUser] = await db
    .insert(users)
    .values({
      ...userData,
      phoneNumber: formattedPhone,
      organizationId,
    })
    .returning();

  // Update organization member count
  await db
    .update(organizations)
    .set({
      totalMembers: sql`${organizations.totalMembers} + 1`,
    })
    .where(eq(organizations.id, organizationId));

  return c.json({
    success: true,
    data: newUser,
  }, 201);
});

// Get user by ID
userRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();
  const organizationId = c.get('organizationId');

  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, id),
        eq(users.organizationId, organizationId),
        eq(users.deletedAt, null)
      )
    )
    .limit(1);

  if (!user) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }

  return c.json({
    success: true,
    data: user,
  });
});

// Update user
userRoutes.patch('/:id', validateBody(updateUserSchema), async (c) => {
  const { id } = c.req.param();
  const organizationId = c.get('organizationId');
  const userId = c.get('userId');
  const userRole = c.get('userRole');
  const updates = c.get('validatedBody');

  // Members can only update themselves, admins can update anyone
  if (userRole === 'member' && id !== userId) {
    throw new AppError('FORBIDDEN', 'You can only update your own profile', 403);
  }

  const [updated] = await db
    .update(users)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(users.id, id),
        eq(users.organizationId, organizationId)
      )
    )
    .returning();

  if (!updated) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }

  return c.json({
    success: true,
    data: updated,
  });
});

// Delete user (admin only)
userRoutes.delete('/:id', requireRole('org_admin'), async (c) => {
  const { id } = c.req.param();
  const organizationId = c.get('organizationId');

  const [deleted] = await db
    .update(users)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(users.id, id),
        eq(users.organizationId, organizationId)
      )
    )
    .returning();

  if (!deleted) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }

  // Update organization member count
  await db
    .update(organizations)
    .set({
      totalMembers: sql`${organizations.totalMembers} - 1`,
    })
    .where(eq(organizations.id, organizationId));

  return c.json({
    success: true,
    data: { message: 'User deleted successfully' },
  });
});

export default userRoutes;
