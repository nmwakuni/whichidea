import { pgTable, uuid, varchar, text, jsonb, timestamp, integer, decimal, pgEnum } from 'drizzle-orm/pg-core';

export const organizationType = pgEnum('organization_type', ['chama', 'sacco', 'mfi', 'bank', 'ngo']);
export const subscriptionTier = pgEnum('subscription_tier', ['starter', 'growth', 'enterprise', 'custom']);
export const subscriptionStatus = pgEnum('subscription_status', ['trial', 'active', 'past_due', 'canceled', 'paused']);

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Basic info
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  type: organizationType('type').notNull(),
  description: text('description'),

  // Contact
  phoneNumber: varchar('phone_number', { length: 20 }),
  email: varchar('email', { length: 255 }),

  // Branding
  branding: jsonb('branding').$type<{
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  }>().default({
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    accentColor: '#F59E0B'
  }),

  // Subscription
  subscriptionTier: subscriptionTier('subscription_tier').notNull().default('starter'),
  subscriptionStatus: subscriptionStatus('subscription_status').notNull().default('trial'),
  trialEndsAt: timestamp('trial_ends_at'),
  subscriptionStartedAt: timestamp('subscription_started_at'),

  // M-Pesa config (encrypted)
  mpesaConfig: jsonb('mpesa_config').$type<{
    paybill?: string;
    shortcode?: string;
    consumerKey?: string;
    consumerSecret?: string;
  }>(),

  // Settings
  settings: jsonb('settings').$type<{
    allowManualTransactions: boolean;
    requireTransactionApproval: boolean;
    notificationsEnabled: boolean;
    currency: string;
  }>().default({
    allowManualTransactions: true,
    requireTransactionApproval: false,
    notificationsEnabled: true,
    currency: 'KES'
  }),

  // Stats
  totalMembers: integer('total_members').default(0),
  totalChallenges: integer('total_challenges').default(0),
  totalSavings: decimal('total_savings', { precision: 15, scale: 2 }).default('0'),

  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
