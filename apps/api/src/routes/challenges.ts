import { Hono } from 'hono';
import { db, challenges, challengeParticipants, users, teams } from '@savegame/database';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';
import {
  createChallengeSchema,
  updateChallengeSchema,
  challengeFilterSchema,
  joinChallengeSchema,
} from '@savegame/shared';

const challengeRoutes = new Hono();

// All routes require authentication
challengeRoutes.use('*', authenticate());

// List challenges
challengeRoutes.get('/', validateQuery(challengeFilterSchema), async (c) => {
  const organizationId = c.get('organizationId');
  const { page, pageSize, status, type } = c.get('validatedQuery');

  const offset = (page - 1) * pageSize;

  let conditions = [eq(challenges.organizationId, organizationId), eq(challenges.deletedAt, null)];

  if (status) {
    conditions.push(eq(challenges.status, status));
  }

  if (type) {
    conditions.push(eq(challenges.type, type));
  }

  const [data, count] = await Promise.all([
    db
      .select()
      .from(challenges)
      .where(and(...conditions))
      .orderBy(desc(challenges.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql`count(*)` })
      .from(challenges)
      .where(and(...conditions)),
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

// Create challenge (admin only)
challengeRoutes.post(
  '/',
  requireRole('org_admin'),
  validateBody(createChallengeSchema),
  async (c) => {
    const organizationId = c.get('organizationId');
    const userId = c.get('userId');
    const challengeData = c.get('validatedBody');

    const [newChallenge] = await db
      .insert(challenges)
      .values({
        ...challengeData,
        organizationId,
        createdBy: userId,
      })
      .returning();

    return c.json(
      {
        success: true,
        data: newChallenge,
      },
      201
    );
  }
);

// Get challenge by ID
challengeRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();
  const organizationId = c.get('organizationId');

  const [challenge] = await db
    .select()
    .from(challenges)
    .where(
      and(
        eq(challenges.id, id),
        eq(challenges.organizationId, organizationId),
        eq(challenges.deletedAt, null)
      )
    )
    .limit(1);

  if (!challenge) {
    throw new AppError('NOT_FOUND', 'Challenge not found', 404);
  }

  return c.json({
    success: true,
    data: challenge,
  });
});

// Update challenge (admin only)
challengeRoutes.patch(
  '/:id',
  requireRole('org_admin'),
  validateBody(updateChallengeSchema),
  async (c) => {
    const { id } = c.req.param();
    const organizationId = c.get('organizationId');
    const updates = c.get('validatedBody');

    const [updated] = await db
      .update(challenges)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(challenges.id, id), eq(challenges.organizationId, organizationId)))
      .returning();

    if (!updated) {
      throw new AppError('NOT_FOUND', 'Challenge not found', 404);
    }

    return c.json({
      success: true,
      data: updated,
    });
  }
);

// Delete challenge (admin only)
challengeRoutes.delete('/:id', requireRole('org_admin'), async (c) => {
  const { id } = c.req.param();
  const organizationId = c.get('organizationId');

  const [deleted] = await db
    .update(challenges)
    .set({ deletedAt: new Date() })
    .where(and(eq(challenges.id, id), eq(challenges.organizationId, organizationId)))
    .returning();

  if (!deleted) {
    throw new AppError('NOT_FOUND', 'Challenge not found', 404);
  }

  return c.json({
    success: true,
    data: { message: 'Challenge deleted successfully' },
  });
});

// Publish challenge (admin only)
challengeRoutes.post('/:id/publish', requireRole('org_admin'), async (c) => {
  const { id } = c.req.param();
  const organizationId = c.get('organizationId');

  const [updated] = await db
    .update(challenges)
    .set({
      status: 'active',
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(challenges.id, id),
        eq(challenges.organizationId, organizationId),
        eq(challenges.status, 'draft')
      )
    )
    .returning();

  if (!updated) {
    throw new AppError('NOT_FOUND', 'Challenge not found or already published', 404);
  }

  return c.json({
    success: true,
    data: updated,
  });
});

// Join challenge
challengeRoutes.post('/:id/join', validateBody(joinChallengeSchema), async (c) => {
  const { id } = c.req.param();
  const userId = c.get('userId');
  const organizationId = c.get('organizationId');
  const { teamId } = c.get('validatedBody');

  // Check if challenge exists and is active
  const [challenge] = await db
    .select()
    .from(challenges)
    .where(
      and(
        eq(challenges.id, id),
        eq(challenges.organizationId, organizationId),
        eq(challenges.status, 'active')
      )
    )
    .limit(1);

  if (!challenge) {
    throw new AppError('NOT_FOUND', 'Challenge not found or not active', 404);
  }

  // Check if already joined
  const [existing] = await db
    .select()
    .from(challengeParticipants)
    .where(and(eq(challengeParticipants.challengeId, id), eq(challengeParticipants.userId, userId)))
    .limit(1);

  if (existing) {
    throw new AppError('DUPLICATE_ENTRY', 'Already joined this challenge', 400);
  }

  // Join challenge
  const [participant] = await db
    .insert(challengeParticipants)
    .values({
      challengeId: id,
      userId,
      teamId: teamId || null,
      status: 'active',
    })
    .returning();

  // Update challenge participant count
  await db
    .update(challenges)
    .set({
      participantsCount: sql`${challenges.participantsCount} + 1`,
    })
    .where(eq(challenges.id, id));

  return c.json({
    success: true,
    data: participant,
  });
});

// Leave challenge
challengeRoutes.post('/:id/leave', async (c) => {
  const { id } = c.req.param();
  const userId = c.get('userId');

  const [updated] = await db
    .update(challengeParticipants)
    .set({
      status: 'withdrawn',
      withdrawnAt: new Date(),
    })
    .where(
      and(
        eq(challengeParticipants.challengeId, id),
        eq(challengeParticipants.userId, userId),
        eq(challengeParticipants.status, 'active')
      )
    )
    .returning();

  if (!updated) {
    throw new AppError('NOT_FOUND', 'Not participating in this challenge', 404);
  }

  // Update challenge participant count
  await db
    .update(challenges)
    .set({
      participantsCount: sql`${challenges.participantsCount} - 1`,
    })
    .where(eq(challenges.id, id));

  return c.json({
    success: true,
    data: { message: 'Successfully left challenge' },
  });
});

// Get challenge participants
challengeRoutes.get('/:id/participants', async (c) => {
  const { id } = c.req.param();
  const organizationId = c.get('organizationId');

  // Verify challenge belongs to organization
  const [challenge] = await db
    .select()
    .from(challenges)
    .where(and(eq(challenges.id, id), eq(challenges.organizationId, organizationId)))
    .limit(1);

  if (!challenge) {
    throw new AppError('NOT_FOUND', 'Challenge not found', 404);
  }

  const participants = await db
    .select({
      participant: challengeParticipants,
      user: users,
    })
    .from(challengeParticipants)
    .innerJoin(users, eq(challengeParticipants.userId, users.id))
    .where(eq(challengeParticipants.challengeId, id))
    .orderBy(desc(challengeParticipants.rank));

  return c.json({
    success: true,
    data: participants,
  });
});

export default challengeRoutes;
