import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { operations, approvals, timelineEntries, operationComments, users } from '@flowops/database';
import { eq, and, desc } from 'drizzle-orm';

// GET /api/operations/[id] — Get operation detail with timeline
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireSession();

    // Get operation
    const [operation] = await db
      .select()
      .from(operations)
      .where(
        and(
          eq(operations.id, params.id),
          eq(operations.tenantId, session.tenantId),
        ),
      );

    if (!operation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Get timeline
    const timeline = await db
      .select()
      .from(timelineEntries)
      .where(eq(timelineEntries.operationId, params.id))
      .orderBy(desc(timelineEntries.createdAt));

    // Get approvals
    const operationApprovals = await db
      .select()
      .from(approvals)
      .where(eq(approvals.operationId, params.id));

    // Get comments
    const comments = await db
      .select()
      .from(operationComments)
      .where(eq(operationComments.operationId, params.id))
      .orderBy(desc(operationComments.createdAt));

    return NextResponse.json({
      data: {
        operation,
        timeline,
        approvals: operationApprovals,
        comments,
      },
    });
  } catch (error) {
    console.error('Failed to fetch operation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
