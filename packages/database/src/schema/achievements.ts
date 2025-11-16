import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  integer,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';
import { challenges } from './challenges';

export const achievementRarity = pgEnum('achievement_rarity', [
  'common',
  'rare',
  'epic',
  'legendary',
]);

export const achievements = pgTable('achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, {
    onDelete: 'cascade',
  }),

  // Info
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 100 }),
  rarity: achievementRarity('rarity').notNull().default('common'),

  // Criteria
  criteria: jsonb('criteria')
    .$type<{
      type: 'first_save' | 'streak' | 'total_saved' | 'challenges_completed' | 'rank';
      minAmount?: number;
      days?: number;
      amount?: number;
      count?: number;
      position?: number;
      challengeId?: string;
    }>()
    .notNull(),

  // Display
  sortOrder: integer('sort_order').default(0),

  // Stats
  timesAwarded: integer('times_awarded').default(0),

  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const userAchievements = pgTable('user_achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  achievementId: uuid('achievement_id')
    .notNull()
    .references(() => achievements.id, { onDelete: 'cascade' }),
  challengeId: uuid('challenge_id').references(() => challenges.id, { onDelete: 'set null' }),

  // Progress
  progress: jsonb('progress'),

  // Timing
  earnedAt: timestamp('earned_at').defaultNow(),
});

export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type NewUserAchievement = typeof userAchievements.$inferInsert;
