import { db, users, achievements, userAchievements, challengeParticipants } from '@savegame/database';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Check and award achievements for a user
 */
export async function checkAndAwardAchievements(userId: string, context?: {
  challengeId?: string;
  transactionAmount?: number;
}) {
  // Get user data
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return;

  // Get all available achievements for this organization
  const availableAchievements = await db
    .select()
    .from(achievements)
    .where(
      and(
        eq(achievements.organizationId, user.organizationId),
        eq(achievements.deletedAt, null)
      )
    );

  // Check each achievement
  for (const achievement of availableAchievements) {
    const criteria = achievement.criteria as any;

    // Check if already awarded
    const [existing] = await db
      .select()
      .from(userAchievements)
      .where(
        and(
          eq(userAchievements.userId, userId),
          eq(userAchievements.achievementId, achievement.id)
        )
      )
      .limit(1);

    if (existing) continue;

    let shouldAward = false;

    // Check criteria
    switch (criteria.type) {
      case 'first_save':
        if (context?.transactionAmount && context.transactionAmount >= (criteria.minAmount || 0)) {
          shouldAward = true;
        }
        break;

      case 'streak':
        if (user.currentStreak >= (criteria.days || 0)) {
          shouldAward = true;
        }
        break;

      case 'total_saved':
        if (Number(user.totalSaved) >= (criteria.amount || 0)) {
          shouldAward = true;
        }
        break;

      case 'challenges_completed':
        if (user.challengesCompleted >= (criteria.count || 0)) {
          shouldAward = true;
        }
        break;

      case 'rank':
        if (context?.challengeId && criteria.position) {
          const [participant] = await db
            .select()
            .from(challengeParticipants)
            .where(
              and(
                eq(challengeParticipants.userId, userId),
                eq(challengeParticipants.challengeId, context.challengeId)
              )
            )
            .limit(1);

          if (participant && participant.rank === criteria.position) {
            shouldAward = true;
          }
        }
        break;
    }

    // Award achievement
    if (shouldAward) {
      await db
        .insert(userAchievements)
        .values({
          userId,
          achievementId: achievement.id,
          challengeId: context?.challengeId || null,
        });

      // Update achievement count
      await db
        .update(achievements)
        .set({
          timesAwarded: sql`${achievements.timesAwarded} + 1`,
        })
        .where(eq(achievements.id, achievement.id));

      // TODO: Send notification
      console.log(`Achievement unlocked: ${achievement.name} for user ${userId}`);
    }
  }
}

/**
 * Update user streak based on transactions
 */
export async function updateUserStreak(userId: string) {
  const { transactions } = await import('@savegame/database');

  // Get user's last two transaction dates
  const recentTransactions = await db
    .select({
      date: sql`DATE(${transactions.transactionDate})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.status, 'verified')
      )
    )
    .orderBy(sql`${transactions.transactionDate} DESC`)
    .limit(2);

  if (recentTransactions.length === 0) return;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return;

  // Calculate streak
  const today = new Date();
  const lastTransactionDate = new Date(recentTransactions[0].date as string);
  const daysDiff = Math.floor((today.getTime() - lastTransactionDate.getTime()) / (1000 * 60 * 60 * 24));

  let newStreak = user.currentStreak;

  if (daysDiff === 0) {
    // Same day transaction, maintain streak
    newStreak = user.currentStreak;
  } else if (daysDiff === 1) {
    // Consecutive day, increment streak
    newStreak = user.currentStreak + 1;
  } else {
    // Streak broken, reset to 1
    newStreak = 1;
  }

  // Update user streak
  await db
    .update(users)
    .set({
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, user.longestStreak),
    })
    .where(eq(users.id, userId));
}

/**
 * Calculate and update leaderboard for a challenge
 */
export async function recalculateLeaderboard(challengeId: string) {
  const { leaderboard } = await import('@savegame/database');

  // Get all participants sorted by points
  const participants = await db
    .select()
    .from(challengeParticipants)
    .where(eq(challengeParticipants.challengeId, challengeId))
    .orderBy(sql`${challengeParticipants.totalPoints} DESC, ${challengeParticipants.totalContributed} DESC`);

  // Delete existing leaderboard entries
  await db
    .delete(leaderboard)
    .where(eq(leaderboard.challengeId, challengeId));

  // Create new leaderboard entries
  if (participants.length > 0) {
    const leaderboardEntries = participants.map((participant, index) => ({
      challengeId,
      userId: participant.userId,
      rank: index + 1,
      totalSaved: participant.totalContributed,
      totalPoints: participant.totalPoints,
    }));

    await db.insert(leaderboard).values(leaderboardEntries);

    // Update participant ranks
    for (let i = 0; i < participants.length; i++) {
      await db
        .update(challengeParticipants)
        .set({ rank: i + 1 })
        .where(eq(challengeParticipants.id, participants[i].id));
    }
  }
}

/**
 * Check if challenge is completed and update status
 */
export async function checkChallengeCompletion(challengeId: string) {
  const { challenges } = await import('@savegame/database');

  const [challenge] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);

  if (!challenge || challenge.status !== 'active') return;

  const today = new Date();
  const endDate = new Date(challenge.endDate);

  // Check if challenge end date has passed
  if (today > endDate) {
    await db
      .update(challenges)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(challenges.id, challengeId));

    // Mark all active participants as completed
    await db
      .update(challengeParticipants)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(
        and(
          eq(challengeParticipants.challengeId, challengeId),
          eq(challengeParticipants.status, 'active')
        )
      );

    // Update users' completed challenges count
    const completedParticipants = await db
      .select()
      .from(challengeParticipants)
      .where(
        and(
          eq(challengeParticipants.challengeId, challengeId),
          eq(challengeParticipants.status, 'completed')
        )
      );

    for (const participant of completedParticipants) {
      await db
        .update(users)
        .set({
          challengesCompleted: sql`${users.challengesCompleted} + 1`,
        })
        .where(eq(users.id, participant.userId));

      // Check for achievements
      await checkAndAwardAchievements(participant.userId, { challengeId });
    }

    // TODO: Send completion notifications
  }
}
