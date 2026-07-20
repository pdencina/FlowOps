import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { operations, operationTypes, users, timelineEntries, approvals } from '@flowops/database';
import { eq, and, desc } from 'drizzle-orm';
import { OperationDetailView } from './operation-detail-view';

interface Props {
  params: { id: string };
}

export default async function OperationPage({ params }: Props) {
  const session = await getSession();
  if (!session) return null;

  // Get operation with type and requester
  const [operation] = await db
    .select({
      id: operations.id,
      title: operations.title,
      status: operations.status,
      data: operations.data,
      summary: operations.summary,
      source: operations.source,
      currentApproverId: operations.currentApproverId,
      createdAt: operations.createdAt,
      resolvedAt: operations.resolvedAt,
      requesterName: users.name,
      requesterId: operations.requesterId,
      typeName: operationTypes.name,
      typeIcon: operationTypes.icon,
      typeFields: operationTypes.fields,
    })
    .from(operations)
    .innerJoin(users, eq(users.id, operations.requesterId))
    .innerJoin(operationTypes, eq(operationTypes.id, operations.operationTypeId))
    .where(
      and(
        eq(operations.id, params.id),
        eq(operations.tenantId, session.tenantId),
      ),
    );

  if (!operation) notFound();

  // Get timeline
  const timeline = await db
    .select({
      id: timelineEntries.id,
      actorType: timelineEntries.actorType,
      action: timelineEntries.action,
      details: timelineEntries.details,
      createdAt: timelineEntries.createdAt,
      actorName: users.name,
    })
    .from(timelineEntries)
    .leftJoin(users, eq(users.id, timelineEntries.actorId))
    .where(eq(timelineEntries.operationId, params.id))
    .orderBy(desc(timelineEntries.createdAt));

  const canApprove =
    operation.status === 'awaiting_approval' &&
    operation.currentApproverId === session.id;

  return (
    <OperationDetailView
      operation={operation}
      timeline={timeline}
      canApprove={canApprove}
      currentUserId={session.id}
    />
  );
}
