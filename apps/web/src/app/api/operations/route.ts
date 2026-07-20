import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { operations, operationTypes, approvals, timelineEntries, users } from '@flowops/database';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { inngest } from '@/lib/inngest/client';
import { z } from 'zod';

// POST /api/operations — Create a new operation
const createSchema = z.object({
  operationTypeId: z.string().uuid(),
  title: z.string().min(1).max(500),
  data: z.record(z.any()),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const parsed = createSchema.parse(body);

    // Get the operation type to determine approval rules
    const [opType] = await db
      .select()
      .from(operationTypes)
      .where(
        and(
          eq(operationTypes.id, parsed.operationTypeId),
          eq(operationTypes.tenantId, session.tenantId),
        ),
      );

    if (!opType) {
      return NextResponse.json(
        { error: 'Operation type not found' },
        { status: 404 },
      );
    }

    // Determine approver based on rules
    const approverId = resolveApprover(opType.approvalRules as any[], parsed.data);

    // Create the operation
    const [operation] = await db
      .insert(operations)
      .values({
        tenantId: session.tenantId,
        operationTypeId: parsed.operationTypeId,
        requesterId: session.id,
        title: parsed.title,
        data: parsed.data,
        status: approverId ? 'awaiting_approval' : 'pending',
        currentApproverId: approverId,
        source: 'web',
      })
      .returning();

    // Create approval record if there's an approver
    if (approverId) {
      await db.insert(approvals).values({
        tenantId: session.tenantId,
        operationId: operation.id,
        approverId,
      });
    }

    // Create timeline entry
    await db.insert(timelineEntries).values({
      tenantId: session.tenantId,
      operationId: operation.id,
      actorId: session.id,
      actorType: 'user',
      action: 'created',
      details: { source: 'web' },
    });

    // Emit events via Inngest for background processing
    await inngest.send({
      name: 'operation/created',
      data: {
        operationId: operation.id,
        tenantId: session.tenantId,
        requesterId: session.id,
        requesterName: session.name,
        approverId,
        title: parsed.title,
        operationTypeName: opType.name,
        slaHours: opType.slaHours ?? 48,
      },
    });

    return NextResponse.json({ data: operation }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Failed to create operation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// GET /api/operations — Get operations for current user (inbox)
export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'inbox';

    if (view === 'inbox') {
      // Operations awaiting my approval
      const pending = await db
        .select()
        .from(operations)
        .where(
          and(
            eq(operations.tenantId, session.tenantId),
            eq(operations.currentApproverId, session.id),
            eq(operations.status, 'awaiting_approval'),
          ),
        )
        .orderBy(desc(operations.createdAt));

      return NextResponse.json({ data: pending });
    }

    if (view === 'mine') {
      // Operations I created
      const mine = await db
        .select()
        .from(operations)
        .where(
          and(
            eq(operations.tenantId, session.tenantId),
            eq(operations.requesterId, session.id),
          ),
        )
        .orderBy(desc(operations.createdAt));

      return NextResponse.json({ data: mine });
    }

    // Admin: all operations
    if (view === 'all' && session.role === 'admin') {
      const all = await db
        .select()
        .from(operations)
        .where(eq(operations.tenantId, session.tenantId))
        .orderBy(desc(operations.createdAt))
        .limit(50);

      return NextResponse.json({ data: all });
    }

    return NextResponse.json({ data: [] });
  } catch (error) {
    console.error('Failed to fetch operations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---- Helper: Resolve approver from rules ----

function resolveApprover(
  rules: Array<{ condition?: { field: string; operator: string; value: number }; approverId?: string; order: number }>,
  data: Record<string, any>,
): string | undefined {
  if (!rules || rules.length === 0) return undefined;

  // Sort by order
  const sorted = [...rules].sort((a, b) => a.order - b.order);

  for (const rule of sorted) {
    if (!rule.condition) {
      // No condition = default approver
      return rule.approverId;
    }

    const fieldValue = Number(data[rule.condition.field]);
    const ruleValue = Number(rule.condition.value);

    let matches = false;
    switch (rule.condition.operator) {
      case 'gt': matches = fieldValue > ruleValue; break;
      case 'lt': matches = fieldValue < ruleValue; break;
      case 'gte': matches = fieldValue >= ruleValue; break;
      case 'lte': matches = fieldValue <= ruleValue; break;
      case 'eq': matches = fieldValue === ruleValue; break;
    }

    if (matches) return rule.approverId;
  }

  // Fallback to first rule's approver
  return sorted[0]?.approverId;
}
