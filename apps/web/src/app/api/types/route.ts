import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { operationTypes } from '@flowops/database';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// GET /api/types — List operation types for tenant
export async function GET() {
  try {
    const session = await requireSession();

    const types = await db
      .select()
      .from(operationTypes)
      .where(
        and(
          eq(operationTypes.tenantId, session.tenantId),
          eq(operationTypes.isActive, true),
        ),
      );

    return NextResponse.json({ data: types });
  } catch (error) {
    console.error('Failed to fetch types:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/types — Create a new operation type
const createTypeSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  icon: z.string().max(50).optional(),
  fields: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(['text', 'number', 'date', 'select', 'file', 'email', 'phone']),
      required: z.boolean(),
      options: z.array(z.string()).optional(),
      placeholder: z.string().optional(),
    }),
  ),
  approvalRules: z.array(
    z.object({
      condition: z
        .object({
          field: z.string(),
          operator: z.enum(['gt', 'lt', 'eq', 'gte', 'lte']),
          value: z.union([z.string(), z.number()]),
        })
        .optional(),
      approverId: z.string().uuid().optional(),
      approverRole: z.string().optional(),
      order: z.number(),
    }),
  ),
  slaHours: z.number().min(1).max(720).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();

    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can create operation types' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = createTypeSchema.parse(body);

    const [type] = await db
      .insert(operationTypes)
      .values({
        tenantId: session.tenantId,
        name: parsed.name,
        description: parsed.description,
        icon: parsed.icon,
        fields: parsed.fields,
        approvalRules: parsed.approvalRules,
        slaHours: parsed.slaHours ?? 48,
      })
      .returning();

    return NextResponse.json({ data: type }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Failed to create type:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
