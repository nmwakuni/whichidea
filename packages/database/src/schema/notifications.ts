import { pgTable, uuid, varchar, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';
import { challenges } from './challenges';
import { transactions } from './transactions';

export const notificationType = pgEnum('notification_type', ['sms', 'whatsapp', 'push', 'email']);
export const notificationStatus = pgEnum('notification_status', [
  'pending',
  'sent',
  'failed',
  'delivered',
]);

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),

  // Content
  type: notificationType('type').notNull(),
  title: varchar('title', { length: 255 }),
  message: text('message').notNull(),

  // Delivery
  status: notificationStatus('status').notNull().default('pending'),
  phoneNumber: varchar('phone_number', { length: 20 }),
  email: varchar('email', { length: 255 }),

  // Provider
  providerId: varchar('provider_id', { length: 100 }),
  providerResponse: jsonb('provider_response'),

  // Related entities
  challengeId: uuid('challenge_id').references(() => challenges.id, { onDelete: 'set null' }),
  transactionId: uuid('transaction_id').references(() => transactions.id, { onDelete: 'set null' }),

  // Timing
  scheduledFor: timestamp('scheduled_for'),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
