import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { operations, approvals, timelineEntries } from '@flowops/database';
import { eq, and } from 'drizzle-orm';
import { inngest } from '@/lib/inngest/client';
import { z } from 'zod';

const approveSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  comment: z.string().optional(),
});

// POST /api/operations/[id]/approve — Approve or reject
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const { decision, comment } = approveSchema.parse(body);

    // Verify the operation exists and user is the current approver
    const [operation] = await db
      .select()
      .from(operations)
      .where(
        and(
          eq(operations.id, params.id),
          eq(operations.tenantId, session.tenantId),
          eq(operations.currentApproverId, session.id),
          eq(operations.status, 'awaiting_approval'),
        ),
      );

    if (!operation) {
      return NextResponse.json(
        { error: 'Operation not found or you are not the approver' },
        { status: 404 },
      );
    }

    // Update the approval record
    await db
      .update(approvals)
      .set({
        decision,
        comment,
        decidedAt: new Date(),
      })
      .where(
        and(
          eq(approvals.operationId, params.id),
          eq(approvals.approverId, session.id),
        ),
      );

    // Update operation status
    const newStatus = decision === 'approved' ? 'approved' : 'rejected';
    await db
      .update(operations)
      .set({
        status: newStatus,
        currentApproverId: null,
        resolvedAt: new Date(),
      })
      .where(eq(operations.id, params.id));

    // Create timeline entry
    await db.insert(timelineEntries).values({
      tenantId: session.tenantId,
      operationId: params.id,
      actorId: session.id,
      actorType: 'user',
      action: decision,
      details: comment ? { comment } : {},
    });

    // Emit event for notifications and tracking
    await inngest.send({
      name: 'operation/approval.decided',
      data: {
        operationId: params.id,
        tenantId: session.tenantId,
        approverId: session.id,
        approverName: session.name,
        decision,
        comment,
        requesterId: operation.requesterId,
        operationTitle: operation.title,
      },
    });

    return NextResponse.json({
      data: { operationId: params.id, decision, status: newStatus },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 },
      );
    }
    console.error('Failed to process approval:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
