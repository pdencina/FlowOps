// ============================================================
// Operations Domain Types
// ============================================================

export type OperationStatus =
  | 'pending'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled';

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'file' | 'email' | 'phone';

export type ApprovalDecision = 'approved' | 'rejected';

export type OperationSource = 'web' | 'whatsapp' | 'email';

export type TimelineActorType = 'user' | 'system' | 'ai';

// ---- Operation Type (template) ----

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // For select type
  placeholder?: string;
}

export interface ApprovalRule {
  condition?: ApprovalCondition;
  approverId?: string;      // Specific user
  approverRole?: string;    // Or by role (e.g., "manager")
  order: number;            // For multi-level approval chains
}

export interface ApprovalCondition {
  field: string;            // Which field to check
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: string | number;
}

export interface OperationType {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  icon?: string;
  fields: FieldDefinition[];
  approvalRules: ApprovalRule[];
  slaHours: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---- Operation (instance) ----

export interface Operation {
  id: string;
  tenantId: string;
  operationTypeId: string;
  operationType?: OperationType;
  requesterId: string;
  requester?: { id: string; name: string; avatarUrl?: string };
  title: string;
  data: Record<string, any>;
  status: OperationStatus;
  currentApproverId?: string;
  currentApprover?: { id: string; name: string };
  summary?: string;
  source: OperationSource;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Approval ----

export interface Approval {
  id: string;
  tenantId: string;
  operationId: string;
  approverId: string;
  approver?: { id: string; name: string };
  decision?: ApprovalDecision;
  comment?: string;
  decidedAt?: string;
  createdAt: string;
}

// ---- Timeline ----

export type TimelineAction =
  | 'created'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'commented'
  | 'reminded'
  | 'escalated'
  | 'completed'
  | 'cancelled';

export interface TimelineEntry {
  id: string;
  operationId: string;
  actorId?: string;
  actorType: TimelineActorType;
  actorName?: string;
  action: TimelineAction;
  details?: Record<string, any>;
  createdAt: string;
}

// ---- API Request/Response DTOs ----

export interface CreateOperationDto {
  operationTypeId: string;
  title: string;
  data: Record<string, any>;
}

export interface CreateOperationNaturalDto {
  input: string;
}

export interface CreateOperationTypeDto {
  name: string;
  description?: string;
  icon?: string;
  fields: FieldDefinition[];
  approvalRules: ApprovalRule[];
  slaHours?: number;
}

export interface SubmitApprovalDto {
  decision: ApprovalDecision;
  comment?: string;
}

// ---- Inbox ----

export interface InboxItem {
  operation: Operation;
  action: 'approve' | 'review' | 'respond';
  waitingSince: string;
  isOverdue: boolean;
}

export interface InboxResponse {
  forYou: InboxItem[];
  yourOperations: Operation[];
  overdue: Operation[];
}
