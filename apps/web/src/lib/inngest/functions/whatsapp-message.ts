import { inngest } from '../client';
import { db } from '@/lib/db';
import { users, memberships, operations, approvals, timelineEntries } from '@flowops/database';
import { eq, and } from 'drizzle-orm';

/**
 * Processes incoming WhatsApp messages.
 * Determines if it's:
 * 1. An approval response (button reply)
 * 2. A new operation request
 * 3. A status query
 *
 * For MVP, we handle approval responses (interactive button replies).
 * Full NLU for creating operations from WhatsApp comes in v1.1.
 */
export const whatsappMessageFn = inngest.createFunction(
  { id: 'whatsapp-message', name: 'WhatsApp Message Received' },
  { event: 'whatsapp/message.received' },
  async ({ event, step }) => {
    const { from, text, interactive, type } = event.data;

    // Step 1: Identify the user by phone number
    const user = await step.run('identify-user', async () => {
      // Normalize phone (remove + prefix if present)
      const phone = from.startsWith('+') ? from : `+${from}`;

      const [found] = await db
        .select({
          id: users.id,
          name: users.name,
          tenantId: memberships.tenantId,
        })
        .from(users)
        .innerJoin(memberships, eq(memberships.userId, users.id))
        .where(eq(users.phone, phone))
        .limit(1);

      return found || null;
    });

    if (!user) {
      // Unknown user — can't process
      // TODO: Send a "register first" message back
      return { status: 'unknown_user', phone: from };
    }

    // Step 2: Handle interactive button replies (approval/rejection)
    if (type === 'interactive' && interactive?.type === 'button_reply') {
      const buttonId = interactive.button_reply.id;

      // Button IDs are formatted as "approve_{operationId}" or "reject_{operationId}"
      const [action, operationId] = buttonId.split('_');

      if ((action === 'approve' || action === 'reject') && operationId) {
        await step.run('process-approval', async () => {
          const decision = action === 'approve' ? 'approved' : 'rejected';

          // Verify user is the approver
          const [operation] = await db
            .select()
            .from(operations)
            .where(
              and(
                eq(operations.id, operationId),
                eq(operations.currentApproverId, user.id),
                eq(operations.status, 'awaiting_approval'),
              ),
            );

          if (!operation) return;

          // Process the approval
          await db
            .update(approvals)
            .set({ decision, decidedAt: new Date() })
            .where(
              and(
                eq(approvals.operationId, operationId),
                eq(approvals.approverId, user.id),
              ),
            );

          await db
            .update(operations)
            .set({
              status: decision === 'approved' ? 'approved' : 'rejected',
              currentApproverId: null,
              resolvedAt: new Date(),
            })
            .where(eq(operations.id, operationId));

          await db.insert(timelineEntries).values({
            tenantId: user.tenantId,
            operationId,
            actorId: user.id,
            actorType: 'user',
            action: decision,
            details: { source: 'whatsapp' },
          });

          // Trigger notification to requester
          await inngest.send({
            name: 'operation/approval.decided',
            data: {
              operationId,
              tenantId: user.tenantId,
              approverId: user.id,
              approverName: user.name,
              decision,
              requesterId: operation.requesterId,
              operationTitle: operation.title,
            },
          });
        });

        return { status: 'approval_processed', action, operationId };
      }
    }

    // Step 3: Handle text messages (future: NLU for creating operations)
    // For MVP, just acknowledge
    return { status: 'received', text, userId: user.id };
  },
);
