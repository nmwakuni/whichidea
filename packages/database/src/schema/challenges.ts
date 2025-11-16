import { pgTable, uuid, varchar, text, jsonb, timestamp, integer, decimal, date, pgEnum } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const challengeType = pgEnum('challenge_type', ['fixed_amount', 'percentage_increase', 'streak', 'group']);
export const challengeStatus = pgEnum('challenge_status', ['draft', 'active', 'completed', 'cancelled']);

export const challenges = pgTable('challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by').notNull().references(() => users.id),

  // Basic info
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: challengeType('type').notNull(),
  status: challengeStatus('status').notNull().default('draft'),

  // Challenge configuration
  target: jsonb('target').$type<{
    amount?: number;
    frequency?: 'daily' | 'weekly' | 'monthly';
    durationWeeks?: number;
    increasePercentage?: number;
    baselinePeriod?: 'last_month' | 'last_3_months';
    consecutiveWeeks?: number;
    minAmountPerWeek?: number;
    teamSize?: number;
    teamTarget?: number;
  }>().notNull(),

  // Timing
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),

  // Gamification
  pointsPerKes: decimal('points_per_kes', { precision: 5, scale: 2 }).default('1.0'),
  streakMultiplier: decimal('streak_multiplier', { precision: 3, scale: 2 }).default('1.5'),
  completionBonus: integer('completion_bonus').default(1000),

  // Rules
  rules: jsonb('rules').$type<{
    minTransactionAmount?: number;
    maxParticipants?: number;
    allowTeams?: boolean;
    private?: boolean;
  }>().default({
    minTransactionAmount: 100,
    allowTeams: false,
    private: false
  }),

  // Stats
  participantsCount: integer('participants_count').default(0),
  totalSaved: decimal('total_saved', { precision: 15, scale: 2 }).default('0'),
  completionRate: decimal('completion_rate', { precision: 5, scale: 2 }).default('0'),

  // Metadata
  publishedAt: timestamp('published_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;
