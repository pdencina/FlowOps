import { inngest } from '../client';
import { db, setTenantContext } from '@/lib/db';
import { users, slaInstances } from '@flowops/database';
import { eq, and } from 'drizzle-orm';
import { Resend } from 'resend';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

/**
 * Triggered when an approval decision is made.
 * Responsibilities:
 * 1. Notify the requester
 * 2. Stop SLA timer
 * 3. Learn from outcome (future AI)
 */
export const approvalDecidedFn = inngest.createFunction(
  { id: 'approval-decided', name: 'Approval Decided' },
  { event: 'operation/approval.decided' },
  async ({ event, step }) => {
    const { operationId, tenantId, approverName, decision, requesterId, operationTitle, comment } = event.data;

    // Step 1: Notify requester
    await step.run('notify-requester', async () => {
      await setTenantContext(tenantId);

      const [requester] = await db
        .select()
        .from(users)
        .where(eq(users.id, requesterId));

      if (!requester?.email) return;

      const statusEmoji = decision === 'approved' ? '✅' : '❌';
      const statusText = decision === 'approved' ? 'aprobada' : 'rechazada';

      await getResend().emails.send({
        from: process.env.EMAIL_FROM || 'FlowOps <notifications@flowops.app>',
        to: requester.email,
        subject: `${statusEmoji} Tu operación fue ${statusText}: ${operationTitle}`,
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 500px;">
            <h2>${statusEmoji} Operación ${statusText}</h2>
            <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0 0 8px;"><strong>${operationTitle}</strong></p>
              <p style="margin: 0; color: #666;">${approverName} ${decision === 'approved' ? 'aprobó' : 'rechazó'} tu solicitud.</p>
              ${comment ? `<p style="margin: 8px 0 0; font-style: italic;">"${comment}"</p>` : ''}
            </div>
          </div>
        `,
      });
    });

    // Step 2: Stop SLA timer
    await step.run('stop-sla', async () => {
      await setTenantContext(tenantId);

      await db
        .update(slaInstances)
        .set({ status: 'completed' })
        .where(
          and(
            eq(slaInstances.operationId, operationId),
            eq(slaInstances.tenantId, tenantId),
          ),
        );
    });

    return { success: true, decision };
  },
);
