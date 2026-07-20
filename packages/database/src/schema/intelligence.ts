import { pgTable, uuid, varchar, text, timestamp, decimal, index } from 'drizzle-orm/pg-core';
import { tenants } from './identity';
import { operations } from './operations';

// ============================================================
// INTELLIGENCE SCHEMA
// ============================================================

// Note: The vector column type requires pgvector extension.
// We define it as a custom type since Drizzle doesn't have built-in vector support.
// The actual column creation happens in raw SQL migration.

export const knowledgeEntries = pgTable(
  'knowledge_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
    category: varchar('category', { length: 100 }).notNull(),
    content: text('content').notNull(),
    // embedding: vector(1536) — added via raw SQL migration
    sourceOperationId: uuid('source_operation_id').references(() => operations.id),
    confidence: decimal('confidence', { precision: 3, scale: 2 }).default('0.80'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantCategoryIdx: index('idx_knowledge_tenant_category').on(table.tenantId, table.category),
  }),
);
