// ============================================================
// Domain Events — Shared Type Definitions
// ============================================================
// These events flow through the internal event bus.
// Each bounded context emits and/or consumes specific events.

// ---- Operations Events ----

export interface OperationCreatedEvent {
  operationId: string;
  tenantId: string;
  requesterId: string;
  operationTypeId: string;
  operationTypeName: string;
  title: string;
  data: Record<string, any>;
  source: 'web' | 'whatsapp' | 'email';
}

export interface ApprovalRequestedEvent {
  operationId: string;
  tenantId: string;
  approverId: string;
  approverName: string;
  requesterName: string;
  operationTitle: string;
  operationTypeName: string;
}

export interface ApprovalDecidedEvent {
  operationId: string;
  tenantId: string;
  approverId: string;
  approverName: string;
  decision: 'approved' | 'rejected';
  comment?: string;
  requesterId: string;
}

export interface OperationCompletedEvent {
  operationId: string;
  tenantId: string;
  resolvedInHours: number;
  operationTypeName: string;
}

export interface OperationCancelledEvent {
  operationId: string;
  tenantId: string;
  reason?: string;
}

// ---- Tracking Events ----

export interface SLAAtRiskEvent {
  operationId: string;
  tenantId: string;
  hoursRemaining: number;
  currentApproverId?: string;
}

export interface SLABreachedEvent {
  operationId: string;
  tenantId: string;
  overdueByHours: number;
  currentApproverId?: string;
}

export interface ReminderDueEvent {
  operationId: string;
  tenantId: string;
  targetUserId: string;
  reminderNumber: number;
  operationTitle: string;
}

export interface EscalationTriggeredEvent {
  operationId: string;
  tenantId: string;
  fromUserId: string;
  toUserId: string;
  reason: string;
}

// ---- Communication Events ----

export interface InboundMessageReceivedEvent {
  tenantId: string;
  channel: 'whatsapp' | 'email';
  senderPhone?: string;
  senderEmail?: string;
  senderId?: string;
  content: string;
  rawPayload: Record<string, any>;
}

export interface MessageDeliveredEvent {
  messageId: string;
  channel: string;
  externalId: string;
}

// ---- Intelligence Events ----

export interface KnowledgeLearnedEvent {
  tenantId: string;
  category: string;
  content: string;
  sourceOperationId?: string;
}

// ---- Event Names (constants for type safety) ----

export const EVENTS = {
  OPERATION_CREATED: 'operation.created',
  APPROVAL_REQUESTED: 'operation.approval.requested',
  APPROVAL_DECIDED: 'operation.approval.decided',
  OPERATION_COMPLETED: 'operation.completed',
  OPERATION_CANCELLED: 'operation.cancelled',
  SLA_AT_RISK: 'tracking.sla.at_risk',
  SLA_BREACHED: 'tracking.sla.breached',
  REMINDER_DUE: 'tracking.reminder.due',
  ESCALATION_TRIGGERED: 'tracking.escalation.triggered',
  INBOUND_MESSAGE: 'communication.message.inbound',
  MESSAGE_DELIVERED: 'communication.message.delivered',
  KNOWLEDGE_LEARNED: 'intelligence.knowledge.learned',
} as const;
