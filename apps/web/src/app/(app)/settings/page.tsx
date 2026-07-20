import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { operationTypes, operations } from '@flowops/database';
import { eq, and, count, sql } from 'drizzle-orm';
import { SettingsView } from './settings-view';

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) return null;
  if (session.role !== 'admin') redirect('/inbox');

  // Get types with usage count
  const types = await db
    .select({
      id: operationTypes.id,
      name: operationTypes.name,
      icon: operationTypes.icon,
      description: operationTypes.description,
      fields: operationTypes.fields,
      approvalRules: operationTypes.approvalRules,
      slaHours: operationTypes.slaHours,
      isActive: operationTypes.isActive,
      createdAt: operationTypes.createdAt,
    })
    .from(operationTypes)
    .where(eq(operationTypes.tenantId, session.tenantId));

  return <SettingsView types={types} />;
}
