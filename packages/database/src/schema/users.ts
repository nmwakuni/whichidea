import {
  pgTable,
  uuid,
  varchar,
  boolean,
  text,
  jsonb,
  timestamp,
  integer,
  decimal,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const userRole = pgEnum('user_role', ['super_admin', 'org_admin', 'member']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),

  // Identity
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  phoneVerified: boolean('phone_verified').default(false),
  email: varchar('email', { length: 255 }),
  emailVerified: boolean('email_verified').default(false),

  // Profile
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),

  // Auth
  role: userRole('role').notNull().default('member'),
  passwordHash: varchar('password_hash', { length: 255 }),

  // Preferences
  preferences: jsonb('preferences')
    .$type<{
      notificationsSms: boolean;
      notificationsWhatsapp: boolean;
      notificationsEmail: boolean;
      language: string;
    }>()
    .default({
      notificationsSms: true,
      notificationsWhatsapp: false,
      notificationsEmail: false,
      language: 'en',
    }),

  // Stats
  totalSaved: decimal('total_saved', { precision: 15, scale: 2 }).default('0'),
  totalPoints: integer('total_points').default(0),
  currentStreak: integer('current_streak').default(0),
  longestStreak: integer('longest_streak').default(0),
  challengesCompleted: integer('challenges_completed').default(0),

  // Metadata
  lastActiveAt: timestamp('last_active_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
