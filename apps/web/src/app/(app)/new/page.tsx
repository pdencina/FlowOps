import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { operationTypes } from '@flowops/database';
import { eq, and } from 'drizzle-orm';
import { NewOperationView } from './new-operation-view';

export default async function NewOperationPage() {
  const session = await getSession();
  if (!session) return null;

  // Get available operation types
  const types = await db
    .select({
      id: operationTypes.id,
      name: operationTypes.name,
      icon: operationTypes.icon,
      fields: operationTypes.fields,
      description: operationTypes.description,
    })
    .from(operationTypes)
    .where(
      and(
        eq(operationTypes.tenantId, session.tenantId),
        eq(operationTypes.isActive, true),
      ),
    );

  return <NewOperationView types={types} />;
}
