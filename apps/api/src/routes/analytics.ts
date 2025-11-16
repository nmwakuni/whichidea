import { Hono } from 'hono';
import { db, users, challenges, transactions, challengeParticipants } from '@savegame/database';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';

const analyticsRoutes = new Hono();

// All routes require authentication
analyticsRoutes.use('*', authenticate());

// Get organization overview analytics
analyticsRoutes.get('/overview', requireRole('org_admin'), async (c) => {
  const organizationId = c.get('organizationId');
  const { organizations } = await import('@savegame/database');

  // Get organization data
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) {
    throw new AppError('NOT_FOUND', 'Organization not found', 404);
  }

  // Get counts
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalMembers,
    activeMembers,
    totalChallenges,
    activeChallenges,
    savingsThisMonth,
    savingsLastMonth,
  ] = await Promise.all([
    db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(and(eq(users.organizationId, organizationId), eq(users.deletedAt, null))),
    db
      .select({ count: sql`count(distinct ${users.id})` })
      .from(users)
      .innerJoin(transactions, eq(users.id, transactions.userId))
      .where(
        and(
          eq(users.organizationId, organizationId),
          gte(transactions.transactionDate, thisMonthStart)
        )
      ),
    db
      .select({ count: sql`count(*)` })
      .from(challenges)
      .where(and(eq(challenges.organizationId, organizationId), eq(challenges.deletedAt, null))),
    db
      .select({ count: sql`count(*)` })
      .from(challenges)
      .where(and(eq(challenges.organizationId, organizationId), eq(challenges.status, 'active'))),
    db
      .select({ total: sql`COALESCE(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.status, 'verified'),
          gte(transactions.transactionDate, thisMonthStart)
        )
      ),
    db
      .select({ total: sql`COALESCE(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.organizationId, organizationId),
          eq(transactions.status, 'verified'),
          gte(transactions.transactionDate, lastMonthStart),
          lte(transactions.transactionDate, lastMonthEnd)
        )
      ),
  ]);

  const savingsThisMonthValue = Number(savingsThisMonth[0]?.total || 0);
  const savingsLastMonthValue = Number(savingsLastMonth[0]?.total || 0);
  const growthRate =
    savingsLastMonthValue > 0
      ? ((savingsThisMonthValue - savingsLastMonthValue) / savingsLastMonthValue) * 100
      : 0;

  return c.json({
    success: true,
    data: {
      totalMembers: Number(totalMembers[0]?.count || 0),
      activeMembers: Number(activeMembers[0]?.count || 0),
      totalChallenges: Number(totalChallenges[0]?.count || 0),
      activeChallenges: Number(activeChallenges[0]?.count || 0),
      totalSavings: Number(org.totalSavings),
      savingsThisMonth: savingsThisMonthValue,
      growthRate: Math.round(growthRate * 100) / 100,
    },
  });
});

// Get savings trends (daily/weekly/monthly)
analyticsRoutes.get('/savings-trends', requireRole('org_admin'), async (c) => {
  const organizationId = c.get('organizationId');
  const period = c.req.query('period') || 'daily'; // daily, weekly, monthly
  const days = Number(c.req.query('days')) || 30;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let dateFormat;
  switch (period) {
    case 'daily':
      dateFormat = sql`DATE(${transactions.transactionDate})`;
      break;
    case 'weekly':
      dateFormat = sql`DATE_TRUNC('week', ${transactions.transactionDate})`;
      break;
    case 'monthly':
      dateFormat = sql`DATE_TRUNC('month', ${transactions.transactionDate})`;
      break;
    default:
      dateFormat = sql`DATE(${transactions.transactionDate})`;
  }

  const trends = await db
    .select({
      date: dateFormat,
      total: sql`COALESCE(sum(${transactions.amount}), 0)`,
      count: sql`count(*)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.organizationId, organizationId),
        eq(transactions.status, 'verified'),
        gte(transactions.transactionDate, startDate)
      )
    )
    .groupBy(dateFormat)
    .orderBy(dateFormat);

  return c.json({
    success: true,
    data: trends,
  });
});

// Get engagement metrics
analyticsRoutes.get('/engagement', requireRole('org_admin'), async (c) => {
  const organizationId = c.get('organizationId');

  const [totalUsers, usersWithTransactions, usersInChallenges] = await Promise.all([
    db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(and(eq(users.organizationId, organizationId), eq(users.deletedAt, null))),
    db
      .select({ count: sql`count(distinct ${users.id})` })
      .from(users)
      .innerJoin(transactions, eq(users.id, transactions.userId))
      .where(eq(users.organizationId, organizationId)),
    db
      .select({ count: sql`count(distinct ${users.id})` })
      .from(users)
      .innerJoin(challengeParticipants, eq(users.id, challengeParticipants.userId))
      .where(
        and(eq(users.organizationId, organizationId), eq(challengeParticipants.status, 'active'))
      ),
  ]);

  const total = Number(totalUsers[0]?.count || 1);
  const withTransactions = Number(usersWithTransactions[0]?.count || 0);
  const inChallenges = Number(usersInChallenges[0]?.count || 0);

  return c.json({
    success: true,
    data: {
      totalUsers: total,
      usersWithTransactions: withTransactions,
      usersInChallenges: inChallenges,
      transactionRate: Math.round((withTransactions / total) * 100),
      challengeParticipationRate: Math.round((inChallenges / total) * 100),
    },
  });
});

// Get challenge performance
analyticsRoutes.get('/challenge-performance', requireRole('org_admin'), async (c) => {
  const organizationId = c.get('organizationId');

  const performance = await db
    .select({
      challenge: challenges,
      participantCount: sql`count(distinct ${challengeParticipants.userId})`,
      totalSaved: sql`COALESCE(sum(${challengeParticipants.totalContributed}), 0)`,
      avgContribution: sql`COALESCE(avg(${challengeParticipants.totalContributed}), 0)`,
    })
    .from(challenges)
    .leftJoin(challengeParticipants, eq(challenges.id, challengeParticipants.challengeId))
    .where(and(eq(challenges.organizationId, organizationId), eq(challenges.deletedAt, null)))
    .groupBy(challenges.id)
    .orderBy(desc(sql`COALESCE(sum(${challengeParticipants.totalContributed}), 0)`));

  return c.json({
    success: true,
    data: performance,
  });
});

// Get top savers
analyticsRoutes.get('/top-savers', requireRole('org_admin'), async (c) => {
  const organizationId = c.get('organizationId');
  const limit = Number(c.req.query('limit')) || 10;

  const topSavers = await db
    .select({
      user: users,
      totalSaved: users.totalSaved,
      totalPoints: users.totalPoints,
      challengesCompleted: users.challengesCompleted,
    })
    .from(users)
    .where(and(eq(users.organizationId, organizationId), eq(users.deletedAt, null)))
    .orderBy(desc(users.totalSaved))
    .limit(limit);

  return c.json({
    success: true,
    data: topSavers,
  });
});

export default analyticsRoutes;
