import { inngest } from '../client';
import { db, setTenantContext } from '@/lib/db';
import { slaInstances, users } from '@flowops/database';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

/**
 * Triggered when a new operation is created.
 * Responsibilities:
 * 1. Start SLA timer
 * 2. Notify the approver (email + in-app)
 * 3. Generate AI summary (future)
 */
export const operationCreatedFn = inngest.createFunction(
  { id: 'operation-created', name: 'Operation Created' },
  { event: 'operation/created' },
  async ({ event, step }) => {
    const { operationId, tenantId, approverId, title, requesterName, operationTypeName, slaHours } = event.data;

    // Step 1: Start SLA timer
    await step.run('start-sla-timer', async () => {
      await setTenantContext(tenantId);

      const deadline = new Date();
      deadline.setHours(deadline.getHours() + slaHours);

      await db.insert(slaInstances).values({
        tenantId,
        operationId,
        deadlineAt: deadline,
        status: 'active',
      });
    });

    // Step 2: Notify approver by email
    if (approverId) {
      await step.run('notify-approver-email', async () => {
        await setTenantContext(tenantId);

        const [approver] = await db
          .select()
          .from(users)
          .where(eq(users.id, approverId));

        if (!approver?.email) return;

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        await getResend().emails.send({
          from: process.env.EMAIL_FROM || 'FlowOps <notifications@flowops.app>',
          to: approver.email,
          subject: `Aprobación pendiente: ${title}`,
          html: `
            <div style="font-family: Inter, sans-serif; max-width: 500px;">
              <h2 style="margin-bottom: 4px;">Nueva operación para aprobar</h2>
              <p style="color: #666; margin-top: 0;">${operationTypeName}</p>
              <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0 0 8px;"><strong>${title}</strong></p>
                <p style="margin: 0; color: #666;">Solicitado por ${requesterName}</p>
              </div>
              <a href="${appUrl}/operations/${operationId}" 
                 style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-right: 8px;">
                Revisar y Aprobar
              </a>
            </div>
          `,
        });
      });
    }

    return { success: true, operationId };
  },
);
