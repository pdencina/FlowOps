import { inngest } from '../client';
import { db } from '@/lib/db';
import { slaInstances, operations } from '@flowops/database';
import { eq, and, lt, sql } from 'drizzle-orm';

/**
 * Runs every 15 minutes via Inngest Cron.
 * Checks for SLAs that are breached or at risk.
 * Sends reminders for operations that need attention.
 */
export const slaCheckerFn = inngest.createFunction(
  {
    id: 'sla-checker',
    name: 'SLA Checker (Cron)',
  },
  { cron: '*/15 * * * *' }, // Every 15 minutes
  async ({ step }) => {
    // Step 1: Find breached SLAs and mark them
    const breached = await step.run('find-breached-slas', async () => {
      const now = new Date();

      const breachedSLAs = await db
        .select({
          id: slaInstances.id,
          operationId: slaInstances.operationId,
          tenantId: slaInstances.tenantId,
          remindedCount: slaInstances.remindedCount,
        })
        .from(slaInstances)
        .where(
          and(
            eq(slaInstances.status, 'active'),
            lt(slaInstances.deadlineAt, now),
          ),
        )
        .limit(100);

      // Mark as breached
      for (const sla of breachedSLAs) {
        await db
          .update(slaInstances)
          .set({ status: 'breached' })
          .where(eq(slaInstances.id, sla.id));
      }

      return breachedSLAs;
    });

    // Step 2: For each breached SLA, check if we need to send reminder
    for (const sla of breached) {
      // Only send reminder if we haven't sent too many
      if (sla.remindedCount < 3) {
        await step.run(`send-reminder-${sla.operationId}`, async () => {
          // Get operation to find current approver
          const [operation] = await db
            .select()
            .from(operations)
            .where(eq(operations.id, sla.operationId));

          if (operation?.currentApproverId) {
            // Send reminder event
            await inngest.send({
              name: 'tracking/send-reminder',
              data: {
                operationId: sla.operationId,
                tenantId: sla.tenantId,
                targetUserId: operation.currentApproverId,
                reminderNumber: sla.remindedCount + 1,
                operationTitle: operation.title,
              },
            });

            // Update reminded count
            await db
              .update(slaInstances)
              .set({
                remindedCount: sla.remindedCount + 1,
                lastRemindedAt: new Date(),
              })
              .where(eq(slaInstances.id, sla.id));
          }
        });
      }
    }

    return { checked: breached.length };
  },
);
