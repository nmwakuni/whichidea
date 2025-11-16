import {
  pgTable,
  uuid,
  varchar,
  decimal,
  timestamp,
  integer,
  text,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';
import { challenges } from './challenges';

export const transactionStatus = pgEnum('transaction_status', [
  'pending',
  'verified',
  'failed',
  'refunded',
]);

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  challengeId: uuid('challenge_id').references(() => challenges.id, { onDelete: 'set null' }),

  // Transaction details
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('KES'),

  // M-Pesa details
  mpesaReceiptNumber: varchar('mpesa_receipt_number', { length: 50 }),
  mpesaTransactionId: varchar('mpesa_transaction_id', { length: 50 }),
  phoneNumber: varchar('phone_number', { length: 20 }),

  // Status
  status: transactionStatus('status').notNull().default('pending'),

  // Verification
  verifiedBy: uuid('verified_by').references(() => users.id),
  verifiedAt: timestamp('verified_at'),

  // Points
  pointsAwarded: integer('points_awarded').default(0),

  // Source
  source: varchar('source', { length: 50 }).default('mpesa'),

  // Metadata
  metadata: jsonb('metadata'),
  notes: text('notes'),

  // Timing
  transactionDate: timestamp('transaction_date').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
