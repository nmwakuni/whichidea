import { pgTable, uuid, integer, decimal, timestamp, unique } from 'drizzle-orm/pg-core';
import { challenges } from './challenges';
import { users } from './users';

export const leaderboard = pgTable(
  'leaderboard',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    challengeId: uuid('challenge_id')
      .notNull()
      .references(() => challenges.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Rankings
    rank: integer('rank').notNull(),
    previousRank: integer('previous_rank'),

    // Scores
    totalSaved: decimal('total_saved', { precision: 15, scale: 2 }).default('0'),
    totalPoints: integer('total_points').default(0),

    // Calculated
    calculatedAt: timestamp('calculated_at').defaultNow(),
  },
  (table) => ({
    uniqueChallengeUser: unique().on(table.challengeId, table.userId),
  })
);

export type LeaderboardEntry = typeof leaderboard.$inferSelect;
export type NewLeaderboardEntry = typeof leaderboard.$inferInsert;
