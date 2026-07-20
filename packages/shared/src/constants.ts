// ============================================================
// Shared Constants
// ============================================================

export const OPERATION_STATUSES = [
  'pending',
  'awaiting_approval',
  'approved',
  'rejected',
  'completed',
  'cancelled',
] as const;

export const ROLES = ['admin', 'approver', 'member'] as const;

export const PLANS = ['free', 'pro', 'business', 'enterprise'] as const;

export const CHANNELS = ['whatsapp', 'email', 'in_app'] as const;

// SLA defaults
export const DEFAULT_SLA_HOURS = 48;
export const REMINDER_INTERVALS_HOURS = [24, 72, 120]; // 1d, 3d, 5d
export const ESCALATION_AFTER_REMINDERS = 3;

// Plan limits
export const PLAN_LIMITS = {
  free: {
    operationTypes: 3,
    operationsPerMonth: 50,
    users: 5,
    whatsapp: false,
    aiSuggestions: false,
  },
  pro: {
    operationTypes: -1, // unlimited
    operationsPerMonth: -1,
    users: 25,
    whatsapp: true,
    aiSuggestions: true,
  },
  business: {
    operationTypes: -1,
    operationsPerMonth: -1,
    users: -1,
    whatsapp: true,
    aiSuggestions: true,
  },
  enterprise: {
    operationTypes: -1,
    operationsPerMonth: -1,
    users: -1,
    whatsapp: true,
    aiSuggestions: true,
  },
} as const;
