import { pgTable, uuid, varchar, jsonb, timestamp, text } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

  // Action
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }).notNull(),
  resourceId: uuid('resource_id'),

  // Changes
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),

  // Context
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),

  // Timing
  createdAt: timestamp('created_at').defaultNow(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
