import { Inngest } from 'inngest';

/**
 * Inngest client for FlowOps.
 * Handles all background jobs: notifications, reminders, SLA checks, AI processing.
 *
 * In development: runs locally via `npx inngest-cli@latest dev`
 * In production: connects to Inngest Cloud (managed, serverless)
 */
export const inngest = new Inngest({
  id: 'flowops',
});

// ---- Event Types ----
// These are the events that trigger background functions.

export type FlowOpsEvents = {
  'operation/created': {
    data: {
      operationId: string;
      tenantId: string;
      requesterId: string;
      requesterName: string;
      approverId?: string;
      title: string;
      operationTypeName: string;
      slaHours: number;
    };
  };
  'operation/approval.decided': {
    data: {
      operationId: string;
      tenantId: string;
      approverId: string;
      approverName: string;
      decision: 'approved' | 'rejected';
      comment?: string;
      requesterId: string;
      operationTitle: string;
    };
  };
  'whatsapp/message.received': {
    data: {
      from: string;
      messageId: string;
      type: string;
      text: string;
      interactive: any;
      contactName: string;
      timestamp: string;
    };
  };
  'tracking/check-slas': {
    data: Record<string, never>;
  };
  'tracking/send-reminder': {
    data: {
      operationId: string;
      tenantId: string;
      targetUserId: string;
      reminderNumber: number;
      operationTitle: string;
    };
  };
};
