import { inngest } from '../client';
import { db, setTenantContext } from '@/lib/db';
import { users, timelineEntries } from '@flowops/database';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends a reminder to an approver who hasn't responded.
 * Escalates tone based on reminder number.
 */
export const sendReminderFn = inngest.createFunction(
  { id: 'send-reminder', name: 'Send Reminder' },
  { event: 'tracking/send-reminder' },
  async ({ event, step }) => {
    const { operationId, tenantId, targetUserId, reminderNumber, operationTitle } = event.data;

    await step.run('send-reminder-email', async () => {
      await setTenantContext(tenantId);

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, targetUserId));

      if (!user?.email) return;

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      // Escalating tone
      const tones = {
        1: { subject: `Recordatorio: ${operationTitle}`, message: 'Tienes una operación pendiente de revisión.' },
        2: { subject: `⚠️ Atrasado: ${operationTitle}`, message: 'Esta operación lleva varios días esperando tu respuesta.' },
        3: { subject: `🔴 Urgente: ${operationTitle}`, message: 'Esta operación está significativamente atrasada. Requiere tu atención inmediata.' },
      };

      const tone = tones[reminderNumber as keyof typeof tones] || tones[3];

      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'FlowOps <notifications@flowops.app>',
        to: user.email,
        subject: tone.subject,
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 500px;">
            <p>${tone.message}</p>
            <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0;"><strong>${operationTitle}</strong></p>
            </div>
            <a href="${appUrl}/operations/${operationId}" 
               style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
              Revisar ahora
            </a>
          </div>
        `,
      });

      // Log in timeline
      await db.insert(timelineEntries).values({
        tenantId,
        operationId,
        actorType: 'system',
        action: 'reminded',
        details: { reminderNumber, targetUserId },
      });
    });

    return { sent: true, reminderNumber };
  },
);
