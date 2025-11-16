import { Hono } from 'hono';
import { db, achievements, userAchievements, users } from '@savegame/database';
import { eq, and, desc, isNull, or, sql } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';
import { createAchievementSchema } from '@savegame/shared';

const achievementRoutes = new Hono();

// All routes require authentication
achievementRoutes.use('*', authenticate());

// List achievements
achievementRoutes.get('/', async (c) => {
  const organizationId = c.get('organizationId');

  // Get both organization-specific and system-wide achievements
  const data = await db
    .select()
    .from(achievements)
    .where(
      and(
        or(eq(achievements.organizationId, organizationId), isNull(achievements.organizationId)),
        isNull(achievements.deletedAt)
      )
    )
    .orderBy(achievements.sortOrder, achievements.rarity);

  return c.json({
    success: true,
    data,
  });
});

// Create achievement (admin only)
achievementRoutes.post(
  '/',
  requireRole('org_admin'),
  validateBody(createAchievementSchema),
  async (c) => {
    const organizationId = c.get('organizationId');
    const achievementData = c.get('validatedBody');

    const [newAchievement] = await db
      .insert(achievements)
      .values({
        ...achievementData,
        organizationId,
      })
      .returning();

    return c.json(
      {
        success: true,
        data: newAchievement,
      },
      201
    );
  }
);

// Get achievement by ID
achievementRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();

  const [achievement] = await db
    .select()
    .from(achievements)
    .where(eq(achievements.id, id))
    .limit(1);

  if (!achievement) {
    throw new AppError('NOT_FOUND', 'Achievement not found', 404);
  }

  return c.json({
    success: true,
    data: achievement,
  });
});

// Get user's achievements
achievementRoutes.get('/user/:userId', async (c) => {
  const { userId } = c.req.param();
  const organizationId = c.get('organizationId');
  const currentUserId = c.get('userId');
  const userRole = c.get('userRole');

  // Members can only view their own achievements
  if (userRole === 'member' && userId !== currentUserId) {
    throw new AppError('FORBIDDEN', 'Access denied', 403);
  }

  // Verify user belongs to organization
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)))
    .limit(1);

  if (!user) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }

  const data = await db
    .select({
      userAchievement: userAchievements,
      achievement: achievements,
    })
    .from(userAchievements)
    .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
    .where(eq(userAchievements.userId, userId))
    .orderBy(desc(userAchievements.earnedAt));

  return c.json({
    success: true,
    data,
  });
});

// Award achievement to user (system function, can be called by admin)
achievementRoutes.post('/award', requireRole('org_admin'), async (c) => {
  const { userId, achievementId, challengeId } = await c.req.json();
  const organizationId = c.get('organizationId');

  // Verify user belongs to organization
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)))
    .limit(1);

  if (!user) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }

  // Check if already awarded
  const [existing] = await db
    .select()
    .from(userAchievements)
    .where(
      and(eq(userAchievements.userId, userId), eq(userAchievements.achievementId, achievementId))
    )
    .limit(1);

  if (existing) {
    throw new AppError('DUPLICATE_ENTRY', 'Achievement already awarded', 400);
  }

  // Award achievement
  const [awarded] = await db
    .insert(userAchievements)
    .values({
      userId,
      achievementId,
      challengeId: challengeId || null,
    })
    .returning();

  // Update achievement times awarded count
  await db
    .update(achievements)
    .set({
      timesAwarded: sql`${achievements.timesAwarded} + 1`,
    })
    .where(eq(achievements.id, achievementId));

  // TODO: Send notification to user

  return c.json(
    {
      success: true,
      data: awarded,
    },
    201
  );
});

export default achievementRoutes;
