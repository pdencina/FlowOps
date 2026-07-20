import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { operations, operationTypes, users, slaInstances } from '@flowops/database';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { SpaceView } from './space-view';

export default async function SpacePage() {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== 'admin') redirect('/inbox');

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Metrics
  const [metrics] = await db
    .select({
      total: count(),
    })
    .from(operations)
    .where(
      and(
        eq(operations.tenantId, session.tenantId),
        sql`${operations.createdAt} >= ${startOfMonth}`,
      ),
    );

  const [pendingCount] = await db
    .select({ count: count() })
    .from(operations)
    .where(
      and(
        eq(operations.tenantId, session.tenantId),
        eq(operations.status, 'awaiting_approval'),
      ),
    );

  const [overdueCount] = await db
    .select({ count: count() })
    .from(slaInstances)
    .where(
      and(
        eq(slaInstances.tenantId, session.tenantId),
        eq(slaInstances.status, 'breached'),
      ),
    );

  // Recent active operations
  const active = await db
    .select({
      id: operations.id,
      title: operations.title,
      status: operations.status,
      createdAt: operations.createdAt,
      requesterName: users.name,
      typeName: operationTypes.name,
      typeIcon: operationTypes.icon,
      approverName: sql<string | null>`(SELECT name FROM users WHERE id = ${operations.currentApproverId})`,
    })
    .from(operations)
    .innerJoin(users, eq(users.id, operations.requesterId))
    .innerJoin(operationTypes, eq(operationTypes.id, operations.operationTypeId))
    .where(
      and(
        eq(operations.tenantId, session.tenantId),
        eq(operations.status, 'awaiting_approval'),
      ),
    )
    .orderBy(desc(operations.createdAt))
    .limit(20);

  return (
    <SpaceView
      metrics={{
        totalThisMonth: metrics.total,
        pending: pendingCount.count,
        overdue: overdueCount.count,
      }}
      activeOperations={active}
    />
  );
}
