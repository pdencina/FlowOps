import { pgTable, uuid, varchar, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { tenants } from './identity';
import { operations } from './operations';

// ============================================================
// TRACKING SCHEMA
// ============================================================

export const slaInstances = pgTable(
  'sla_instances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    operationId: uuid('operation_id').notNull().references(() => operations.id),
    deadlineAt: timestamp('deadline_at', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('active'),
    remindedCount: integer('reminded_count').notNull().default(0),
    lastRemindedAt: timestamp('last_reminded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    activeIdx: index('idx_sla_active').on(table.tenantId, table.status, table.deadlineAt),
    operationIdx: index('idx_sla_operation').on(table.operationId),
  }),
);
