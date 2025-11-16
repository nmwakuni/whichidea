import { Hono } from 'hono';
import { db, leaderboard, challengeParticipants, users } from '@savegame/database';
import { eq, desc } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';

const leaderboardRoutes = new Hono();

// All routes require authentication
leaderboardRoutes.use('*', authenticate());

// Get leaderboard for a challenge
leaderboardRoutes.get('/challenge/:challengeId', async (c) => {
  const { challengeId } = c.req.param();
  const organizationId = c.get('organizationId');

  // Verify challenge belongs to organization
  const { challenges } = await import('@savegame/database');
  const [challenge] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);

  if (!challenge || challenge.organizationId !== organizationId) {
    throw new AppError('NOT_FOUND', 'Challenge not found', 404);
  }

  // Get leaderboard entries
  const entries = await db
    .select({
      entry: leaderboard,
      user: users,
    })
    .from(leaderboard)
    .innerJoin(users, eq(leaderboard.userId, users.id))
    .where(eq(leaderboard.challengeId, challengeId))
    .orderBy(leaderboard.rank);

  return c.json({
    success: true,
    data: entries,
  });
});

// Get user's position in leaderboard
leaderboardRoutes.get('/challenge/:challengeId/me', async (c) => {
  const { challengeId } = c.req.param();
  const userId = c.get('userId');

  const [entry] = await db
    .select({
      entry: leaderboard,
      user: users,
    })
    .from(leaderboard)
    .innerJoin(users, eq(leaderboard.userId, users.id))
    .where(
      eq(leaderboard.challengeId, challengeId),
      eq(leaderboard.userId, userId)
    )
    .limit(1);

  if (!entry) {
    return c.json({
      success: true,
      data: null,
    });
  }

  return c.json({
    success: true,
    data: entry,
  });
});

// Recalculate leaderboard for a challenge (admin only or automatic)
leaderboardRoutes.post('/challenge/:challengeId/recalculate', async (c) => {
  const { challengeId } = c.req.param();
  const organizationId = c.get('organizationId');

  // Verify challenge belongs to organization
  const { challenges } = await import('@savegame/database');
  const [challenge] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);

  if (!challenge || challenge.organizationId !== organizationId) {
    throw new AppError('NOT_FOUND', 'Challenge not found', 404);
  }

  // Get all participants sorted by points
  const participants = await db
    .select()
    .from(challengeParticipants)
    .where(eq(challengeParticipants.challengeId, challengeId))
    .orderBy(desc(challengeParticipants.totalPoints));

  // Delete existing leaderboard entries
  await db
    .delete(leaderboard)
    .where(eq(leaderboard.challengeId, challengeId));

  // Create new leaderboard entries
  const leaderboardEntries = participants.map((participant, index) => ({
    challengeId,
    userId: participant.userId,
    rank: index + 1,
    totalSaved: participant.totalContributed,
    totalPoints: participant.totalPoints,
  }));

  if (leaderboardEntries.length > 0) {
    await db.insert(leaderboard).values(leaderboardEntries);

    // Update participant ranks
    for (let i = 0; i < participants.length; i++) {
      await db
        .update(challengeParticipants)
        .set({ rank: i + 1 })
        .where(eq(challengeParticipants.id, participants[i].id));
    }
  }

  return c.json({
    success: true,
    data: {
      message: 'Leaderboard recalculated',
      entries: leaderboardEntries.length,
    },
  });
});

export default leaderboardRoutes;
