import { pgTable, uuid, varchar, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

export const otpVerifications = pgTable('otp_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  otpCode: varchar('otp_code', { length: 6 }).notNull(),

  // Status
  verified: boolean('verified').default(false),
  attempts: integer('attempts').default(0),

  // Expiry
  expiresAt: timestamp('expires_at').notNull(),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export type OtpVerification = typeof otpVerifications.$inferSelect;
export type NewOtpVerification = typeof otpVerifications.$inferInsert;
