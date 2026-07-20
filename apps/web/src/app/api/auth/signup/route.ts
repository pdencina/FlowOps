import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tenants, users, memberships } from '@flowops/database';
import { z } from 'zod';

const signupSchema = z.object({
  authId: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().min(1),
});

// POST /api/auth/signup — Create tenant + user + membership after Supabase auth
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { authId, name, email, company } = signupSchema.parse(body);

    // Generate slug from company name
    const slug = company
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);

    // Create tenant
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
    const [user] = await db
      .insert(users)
      .values({
        authId,
        name,
        email,
      })
      .returning();

    // Create membership (admin)
    await db.insert(memberships).values({
      tenantId: tenant.id,
      userId: user.id,
      role: 'admin',
    });

    return NextResponse.json(
      { data: { tenantId: tenant.id, userId: user.id } },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
