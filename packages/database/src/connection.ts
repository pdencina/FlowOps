import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Database connection for FlowOps.
 *
 * Uses Supabase's connection pooler (PgBouncer on port 6543)
 * for regular queries, and direct connection (port 5432) for migrations.
 *
 * DATABASE_URL: Pooled connection (pgbouncer=true) — for app queries
 * DATABASE_URL_DIRECT: Direct connection — for migrations only
 */
const connectionString = process.env.DATABASE_URL || 'postgresql://flowops:flowops_dev@localhost:5432/flowops';

// For queries (pooled, transaction mode)
const queryClient = postgres(connectionString, { prepare: false });

// For migrations (direct, needs session-level features)
const directString = process.env.DATABASE_URL_DIRECT || connectionString;
export const migrationClient = postgres(directString, { max: 1 });

export const db = drizzle(queryClient, { schema });

export type Database = typeof db;
