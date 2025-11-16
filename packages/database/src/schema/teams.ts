import { pgTable, uuid, varchar, text, timestamp, integer, decimal } from 'drizzle-orm/pg-core';
import { challenges } from './challenges';
import { users } from './users';

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  challengeId: uuid('challenge_id').notNull().references(() => challenges.id, { onDelete: 'cascade' }),

  // Info
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  avatarUrl: varchar('avatar_url', { length: 500 }),

  // Captain
  captainId: uuid('captain_id').references(() => users.id),

  // Stats
  memberCount: integer('member_count').default(0),
  totalSaved: decimal('total_saved', { precision: 15, scale: 2 }).default('0'),
  totalPoints: integer('total_points').default(0),
  rank: integer('rank'),

  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
