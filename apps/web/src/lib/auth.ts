import { createClient } from '@/lib/supabase/server';
import { db, setTenantContext } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { users, memberships } from '@flowops/database';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  role: 'admin' | 'approver' | 'member';
}

/**
 * Gets the current authenticated user with their tenant context.
 * Returns null if not authenticated.
 *
 * Use in Server Components and Route Handlers.
 */
export async function getSession(): Promise<SessionUser | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Get user record with membership
  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.authId, user.id))
    .limit(1);

  if (!dbUser) return null;

  // Get first membership (for MVP, users belong to one tenant)
  const [membership] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, dbUser.id))
    .limit(1);

  if (!membership) return null;

  // Set tenant context for RLS
  await setTenantContext(membership.tenantId);

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    tenantId: membership.tenantId,
    role: membership.role as SessionUser['role'],
  };
}

/**
 * Requires authentication. Throws redirect if not authenticated.
 * Use in Route Handlers where you need guaranteed auth.
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
