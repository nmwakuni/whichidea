import { pgTable, uuid, jsonb, timestamp, decimal, integer, pgEnum, unique } from 'drizzle-orm/pg-core';
import { challenges } from './challenges';
import { users } from './users';
import { teams } from './teams';

export const participationStatus = pgEnum('participation_status', ['active', 'completed', 'failed', 'withdrawn']);

export const challengeParticipants = pgTable('challenge_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  challengeId: uuid('challenge_id').notNull().references(() => challenges.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'set null' }),

  // Status
  status: participationStatus('status').notNull().default('active'),

  // Progress tracking
  progress: jsonb('progress').$type<{
    currentAmount: number;
    currentStreak: number;
    weeksCompleted: number;
    transactionsCount: number;
    lastTransactionDate?: string;
  }>().default({
    currentAmount: 0,
    currentStreak: 0,
    weeksCompleted: 0,
    transactionsCount: 0
  }),

  // Stats
  totalContributed: decimal('total_contributed', { precision: 15, scale: 2 }).default('0'),
  totalPoints: integer('total_points').default(0),
  rank: integer('rank'),
  badgesEarned: integer('badges_earned').default(0),

  // Timing
  joinedAt: timestamp('joined_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  withdrawnAt: timestamp('withdrawn_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueUserChallenge: unique().on(table.challengeId, table.userId),
}));

export type ChallengeParticipant = typeof challengeParticipants.$inferSelect;
export type NewChallengeParticipant = typeof challengeParticipants.$inferInsert;
