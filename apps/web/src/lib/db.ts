import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@flowops/database';

/**
 * Database connection for server-side operations.
 * Uses Supabase's connection pooler (port 6543) via pgBouncer.
 *
 * IMPORTANT: Always set tenant context before queries using setTenantContext().
 */
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });

/**
 * Sets the tenant context for Row Level Security.
 * Call this before any tenant-scoped query.
 */
export async function setTenantContext(tenantId: string) {
  await client`SELECT set_config('app.current_tenant', ${tenantId}, false)`;
}

export type Database = typeof db;
