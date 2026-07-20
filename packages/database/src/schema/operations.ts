import { pgTable, uuid, varchar, text, timestamp, jsonb, integer, boolean, index } from 'drizzle-orm/pg-core';
import { tenants, users } from './identity';

// ============================================================
// OPERATIONS SCHEMA (Core)
// ============================================================

export const operationTypes = pgTable(
  'operation_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    icon: varchar('icon', { length: 50 }),
    fields: jsonb('fields').notNull().default([]),
    approvalRules: jsonb('approval_rules').notNull().default([]),
    slaHours: integer('sla_hours').default(48),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdx: index('idx_operation_types_tenant').on(table.tenantId),
  }),
);

export const operations = pgTable(
  'operations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    operationTypeId: uuid('operation_type_id').notNull().references(() => operationTypes.id),
    requesterId: uuid('requester_id').notNull().references(() => users.id),
    title: varchar('title', { length: 500 }).notNull(),
    data: jsonb('data').notNull().default({}),
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    currentApproverId: uuid('current_approver_id').references(() => users.id),
    summary: text('summary'),
    source: varchar('source', { length: 50 }).notNull().default('web'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantStatusIdx: index('idx_operations_tenant_status').on(table.tenantId, table.status),
    tenantRequesterIdx: index('idx_operations_tenant_requester').on(table.tenantId, table.requesterId),
    tenantApproverIdx: index('idx_operations_tenant_approver').on(table.tenantId, table.currentApproverId),
    tenantCreatedIdx: index('idx_operations_tenant_created').on(table.tenantId, table.createdAt),
  }),
);

export const approvals = pgTable(
  'approvals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    operationId: uuid('operation_id').notNull().references(() => operations.id),
    approverId: uuid('approver_id').notNull().references(() => users.id),
    decision: varchar('decision', { length: 50 }),
    comment: text('comment'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantApproverIdx: index('idx_approvals_tenant_approver').on(table.tenantId, table.approverId),
    operationIdx: index('idx_approvals_operation').on(table.operationId),
  }),
);

export const timelineEntries = pgTable(
  'timeline_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    operationId: uuid('operation_id').notNull().references(() => operations.id),
    actorId: uuid('actor_id').references(() => users.id),
    actorType: varchar('actor_type', { length: 50 }).notNull().default('user'),
    action: varchar('action', { length: 100 }).notNull(),
    details: jsonb('details').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    operationTimeIdx: index('idx_timeline_operation_time').on(table.operationId, table.createdAt),
  }),
);

export const operationComments = pgTable(
  'operation_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    operationId: uuid('operation_id').notNull().references(() => operations.id),
    authorId: uuid('author_id').notNull().references(() => users.id),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    operationIdx: index('idx_comments_operation').on(table.operationId),
  }),
);
