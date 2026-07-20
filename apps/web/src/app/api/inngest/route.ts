import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { operationCreatedFn } from '@/lib/inngest/functions/operation-created';
import { approvalDecidedFn } from '@/lib/inngest/functions/approval-decided';
import { slaCheckerFn } from '@/lib/inngest/functions/sla-checker';
import { sendReminderFn } from '@/lib/inngest/functions/send-reminder';
import { whatsappMessageFn } from '@/lib/inngest/functions/whatsapp-message';

// Serve all Inngest functions via this route
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    operationCreatedFn,
    approvalDecidedFn,
    slaCheckerFn,
    sendReminderFn,
    whatsappMessageFn,
  ],
});
