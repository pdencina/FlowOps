// ============================================================
// Communication Domain Types
// ============================================================

export type MessageChannel = 'whatsapp' | 'email' | 'in_app';

export type MessageDirection = 'outbound' | 'inbound';

export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  tenantId: string;
  operationId?: string;
  channel: MessageChannel;
  direction: MessageDirection;
  recipientId?: string;
  content: MessageContent;
  status: DeliveryStatus;
  externalId?: string;
  sentAt?: string;
  createdAt: string;
}

export interface MessageContent {
  text?: string;
  templateId?: string;
  templateVars?: Record<string, string>;
  buttons?: MessageButton[];
  attachments?: MessageAttachment[];
}

export interface MessageButton {
  id: string;
  label: string;
  action: string; // e.g., "approve", "reject", "view"
}

export interface MessageAttachment {
  filename: string;
  url: string;
  mimeType: string;
}

// ---- Notifications ----

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  body: string;
  operationId?: string;
  isRead: boolean;
  createdAt: string;
}
