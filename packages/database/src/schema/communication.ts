import { pgTable, uuid, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants, users } from './identity';
import { operations } from './operations';

// ============================================================
// COMMUNICATION SCHEMA
// ============================================================

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    operationId: uuid('operation_id').references(() => operations.id),
    channel: varchar('channel', { length: 50 }).notNull(),
    direction: varchar('direction', { length: 10 }).notNull(),
    recipientId: uuid('recipient_id').references(() => users.id),
    content: jsonb('content').notNull(),
    status: varchar('status', { length: 50 }).notNull().default('queued'),
    externalId: varchar('external_id', { length: 255 }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantOperationIdx: index('idx_messages_tenant_operation').on(table.tenantId, table.operationId),
    tenantChannelIdx: index('idx_messages_tenant_channel').on(table.tenantId, table.channel),
  }),
);
