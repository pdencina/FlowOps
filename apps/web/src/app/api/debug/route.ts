import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { users, memberships } from '@flowops/database';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

// GET /api/debug — Temporary debug endpoint to diagnose auth issues
export async function GET() {
  const steps: Record<string, any> = {};

  try {
    // Step 1: Check env vars
    steps.envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
    };

    // Step 2: Check cookies
    const cookieStore = cookies() as any;
    const allCookies = cookieStore.getAll();
    steps.cookies = allCookies.map((c: any) => c.name);

    // Step 3: Get Supabase user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    steps.supabaseAuth = {
      hasUser: !!user,
      userId: user?.id || null,
      email: user?.email || null,
      error: authError?.message || null,
    };

    if (!user) {
      return NextResponse.json({ steps, result: 'No authenticated user' });
    }

    // Step 4: Query DB for user
    try {
      const dbUsers = await db
        .select()
        .from(users)
        .where(eq(users.authId, user.id))
        .limit(1);
      steps.dbUser = {
        found: dbUsers.length > 0,
        user: dbUsers[0] || null,
      };

      if (dbUsers[0]) {
        // Step 5: Query membership
        const dbMemberships = await db
          .select()
          .from(memberships)
          .where(eq(memberships.userId, dbUsers[0].id))
          .limit(1);
        steps.membership = {
          found: dbMemberships.length > 0,
          membership: dbMemberships[0] || null,
        };
      }
    } catch (dbError: any) {
      steps.dbError = {
        message: dbError.message,
        code: dbError.code,
      };
    }

    return NextResponse.json({ steps, result: 'Debug complete' });
  } catch (error: any) {
    return NextResponse.json({
      steps,
      error: error.message,
      result: 'Error during debug',
    });
  }
}
