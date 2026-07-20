import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { operations, operationTypes, users, slaInstances } from '@flowops/database';
import { eq, and, desc } from 'drizzle-orm';
import { InboxView } from './inbox-view';

export default async function InboxPage() {
  const session = await getSession();
  if (!session) return null;

  // Operations awaiting my approval
  const forYou = await db
    .select({
      id: operations.id,
      title: operations.title,
      status: operations.status,
      source: operations.source,
      createdAt: operations.createdAt,
      requesterName: users.name,
      typeName: operationTypes.name,
      typeIcon: operationTypes.icon,
    })
    .from(operations)
    .innerJoin(users, eq(users.id, operations.requesterId))
    .innerJoin(operationTypes, eq(operationTypes.id, operations.operationTypeId))
    .where(
      and(
        eq(operations.tenantId, session.tenantId),
        eq(operations.currentApproverId, session.id),
        eq(operations.status, 'awaiting_approval'),
      ),
    )
    .orderBy(desc(operations.createdAt));

  // Operations I created
  const mine = await db
    .select({
      id: operations.id,
      title: operations.title,
      status: operations.status,
      source: operations.source,
      createdAt: operations.createdAt,
      typeName: operationTypes.name,
      typeIcon: operationTypes.icon,
    })
    .from(operations)
    .innerJoin(operationTypes, eq(operationTypes.id, operations.operationTypeId))
    .where(
      and(
        eq(operations.tenantId, session.tenantId),
        eq(operations.requesterId, session.id),
      ),
    )
    .orderBy(desc(operations.createdAt))
    .limit(20);

  // Overdue operations (admin only)
  let overdue: typeof forYou = [];
  if (session.role === 'admin') {
    overdue = await db
      .select({
        id: operations.id,
        title: operations.title,
        status: operations.status,
        source: operations.source,
        createdAt: operations.createdAt,
        requesterName: users.name,
        typeName: operationTypes.name,
        typeIcon: operationTypes.icon,
      })
      .from(operations)
      .innerJoin(users, eq(users.id, operations.requesterId))
      .innerJoin(operationTypes, eq(operationTypes.id, operations.operationTypeId))
      .innerJoin(slaInstances, eq(slaInstances.operationId, operations.id))
      .where(
        and(
          eq(operations.tenantId, session.tenantId),
          eq(slaInstances.status, 'breached'),
        ),
      )
      .orderBy(desc(operations.createdAt));
  }

  return (
    <InboxView
      forYou={forYou}
      mine={mine}
      overdue={overdue}
      userName={session.name}
    />
  );
}
