// ============================================================
// Identity Domain Types
// ============================================================

export type Role = 'admin' | 'approver' | 'member';

export type Plan = 'free' | 'pro' | 'business' | 'enterprise';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  settings: TenantSettings;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSettings {
  whatsappEnabled?: boolean;
  defaultSlaHours?: number;
  timezone?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
}

export interface Membership {
  id: string;
  tenantId: string;
  userId: string;
  role: Role;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  tenantId: string;
  role: Role;
}
