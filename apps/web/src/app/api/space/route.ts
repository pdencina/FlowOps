import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { operations, slaInstances } from '@flowops/database';
import { eq, and, count, sql } from 'drizzle-orm';

// GET /api/space — Admin overview with metrics
export async function GET() {
  try {
    const session = await requireSession();

    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get metrics for current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [metrics] = await db
      .select({
        total: count(),
        pending: count(
          sql`CASE WHEN ${operations.status} = 'awaiting_approval' THEN 1 END`,
        ),
        approved: count(
          sql`CASE WHEN ${operations.status} = 'approved' THEN 1 END`,
        ),
        rejected: count(
          sql`CASE WHEN ${operations.status} = 'rejected' THEN 1 END`,
        ),
      })
      .from(operations)
      .where(
        and(
          eq(operations.tenantId, session.tenantId),
          sql`${operations.createdAt} >= ${startOfMonth}`,
        ),
      );

    // Get overdue operations
    const overdue = await db
      .select({
        operationId: slaInstances.operationId,
      })
      .from(slaInstances)
      .where(
        and(
          eq(slaInstances.tenantId, session.tenantId),
          eq(slaInstances.status, 'breached'),
        ),
      );

    return NextResponse.json({
      data: {
        metrics: {
          total: metrics.total,
          pending: metrics.pending,
          approved: metrics.approved,
          rejected: metrics.rejected,
          overdue: overdue.length,
        },
        overdueOperationIds: overdue.map((o) => o.operationId),
      },
    });
  } catch (error) {
    console.error('Failed to fetch space overview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
