import { Hono } from 'hono';
import { db, transactions, users, challenges, organizations } from '@savegame/database';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';
import { createTransactionSchema, transactionFilterSchema } from '@savegame/shared';
import { calculatePoints } from '@savegame/shared';

const transactionRoutes = new Hono();

// All routes require authentication
transactionRoutes.use('*', authenticate());

// List transactions
transactionRoutes.get('/', validateQuery(transactionFilterSchema), async (c) => {
  const organizationId = c.get('organizationId');
  const userRole = c.get('userRole');
  const userId = c.get('userId');
  const { page, pageSize, status, challengeId, startDate, endDate } = c.get('validatedQuery');

  const offset = (page - 1) * pageSize;

  let conditions = [
    eq(transactions.organizationId, organizationId),
  ];

  // Members can only see their own transactions
  if (userRole === 'member') {
    conditions.push(eq(transactions.userId, userId));
  }

  if (status) {
    conditions.push(eq(transactions.status, status));
  }

  if (challengeId) {
    conditions.push(eq(transactions.challengeId, challengeId));
  }

  if (startDate) {
    conditions.push(sql`${transactions.transactionDate} >= ${startDate}`);
  }

  if (endDate) {
    conditions.push(sql`${transactions.transactionDate} <= ${endDate}`);
  }

  const [data, count] = await Promise.all([
    db
      .select({
        transaction: transactions,
        user: users,
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.transactionDate))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql`count(*)` })
      .from(transactions)
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

// Create transaction (manual entry - admin only)
transactionRoutes.post('/', requireRole('org_admin'), validateBody(createTransactionSchema), async (c) => {
  const organizationId = c.get('organizationId');
  const verifiedBy = c.get('userId');
  const transactionData = c.get('validatedBody');

  const [newTransaction] = await db
    .insert(transactions)
    .values({
      ...transactionData,
      organizationId,
      status: 'verified',
      verifiedBy,
      verifiedAt: new Date(),
      source: 'manual',
    })
    .returning();

  // Process transaction (update stats, calculate points)
  await processTransaction(newTransaction.id);

  return c.json({
    success: true,
    data: newTransaction,
  }, 201);
});

// Get transaction by ID
transactionRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();
  const organizationId = c.get('organizationId');
  const userId = c.get('userId');
  const userRole = c.get('userRole');

  const [transaction] = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!transaction) {
    throw new AppError('NOT_FOUND', 'Transaction not found', 404);
  }

  // Members can only see their own transactions
  if (userRole === 'member' && transaction.userId !== userId) {
    throw new AppError('FORBIDDEN', 'Access denied', 403);
  }

  return c.json({
    success: true,
    data: transaction,
  });
});

// Verify transaction (admin only)
transactionRoutes.post('/:id/verify', requireRole('org_admin'), async (c) => {
  const { id } = c.req.param();
  const organizationId = c.get('organizationId');
  const verifiedBy = c.get('userId');

  const [updated] = await db
    .update(transactions)
    .set({
      status: 'verified',
      verifiedBy,
      verifiedAt: new Date(),
    })
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.organizationId, organizationId),
        eq(transactions.status, 'pending')
      )
    )
    .returning();

  if (!updated) {
    throw new AppError('NOT_FOUND', 'Transaction not found or already verified', 404);
  }

  // Process transaction (update stats, calculate points)
  await processTransaction(updated.id);

  return c.json({
    success: true,
    data: updated,
  });
});

// Helper function to process transaction
async function processTransaction(transactionId: string) {
  const [transaction] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId))
    .limit(1);

  if (!transaction) return;

  const amount = Number(transaction.amount);

  // Update user stats
  await db
    .update(users)
    .set({
      totalSaved: sql`${users.totalSaved} + ${amount}`,
    })
    .where(eq(users.id, transaction.userId));

  // Update organization stats
  await db
    .update(organizations)
    .set({
      totalSavings: sql`${organizations.totalSavings} + ${amount}`,
    })
    .where(eq(organizations.id, transaction.organizationId));

  // If linked to challenge, update challenge stats
  if (transaction.challengeId) {
    const { challengeParticipants, challenges } = await import('@savegame/database');

    // Get challenge details for points calculation
    const [challenge] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, transaction.challengeId))
      .limit(1);

    if (challenge) {
      const pointsPerKes = Number(challenge.pointsPerKes || 1);
      const points = calculatePoints(amount, pointsPerKes);

      // Update transaction with points
      await db
        .update(transactions)
        .set({ pointsAwarded: points })
        .where(eq(transactions.id, transactionId));

      // Update challenge participant stats
      await db
        .update(challengeParticipants)
        .set({
          totalContributed: sql`${challengeParticipants.totalContributed} + ${amount}`,
          totalPoints: sql`${challengeParticipants.totalPoints} + ${points}`,
          progress: sql`jsonb_set(
            ${challengeParticipants.progress},
            '{transactionsCount}',
            (COALESCE((${challengeParticipants.progress}->>'transactionsCount')::int, 0) + 1)::text::jsonb
          )`,
        })
        .where(
          and(
            eq(challengeParticipants.challengeId, transaction.challengeId),
            eq(challengeParticipants.userId, transaction.userId)
          )
        );

      // Update challenge total saved
      await db
        .update(challenges)
        .set({
          totalSaved: sql`${challenges.totalSaved} + ${amount}`,
        })
        .where(eq(challenges.id, transaction.challengeId));

      // Update user total points
      await db
        .update(users)
        .set({
          totalPoints: sql`${users.totalPoints} + ${points}`,
        })
        .where(eq(users.id, transaction.userId));

      // TODO: Trigger leaderboard recalculation
      // TODO: Check for achievement unlocks
      // TODO: Send notification
    }
  }
}

export default transactionRoutes;
