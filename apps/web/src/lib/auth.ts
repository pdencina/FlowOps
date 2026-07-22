import { createClient } from '@/lib/supabase/server';
import { db, setTenantContext } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { users, memberships, tenants } from '@flowops/database';

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
 * If the user exists in Supabase Auth but not in our DB,
 * creates the user record automatically (handles failed signups).
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Get user record
    let [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.authId, user.id))
      .limit(1);

    // If user doesn't exist in our DB, create them (handles failed signup)
    if (!dbUser) {
      const meta = user.user_metadata || {};
      const name = meta.name || user.email?.split('@')[0] || 'Usuario';
      const company = meta.company || `${name}'s Company`;

      // Create tenant
      const slug = company
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 100);

      const [tenant] = await db
        .insert(tenants)
        .values({
          name: company,
          slug: `${slug}-${Date.now().toString(36)}`,
          plan: 'free',
          settings: {},
        })
        .returning();

      // Create user
      [dbUser] = await db
        .insert(users)
        .values({
          authId: user.id,
          name,
          email: user.email || '',
        })
        .returning();

      // Create membership
      await db.insert(memberships).values({
        tenantId: tenant.id,
        userId: dbUser.id,
        role: 'admin',
      });
    }

    // Get membership
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
  } catch (error) {
    console.error('getSession error:', error);
    return null;
  }
}

/**
 * Requires authentication. Throws if not authenticated.
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
