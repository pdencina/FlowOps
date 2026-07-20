-- ============================================================
-- FlowOps v1 — Initial Schema Migration
-- ============================================================
-- This migration creates all tables for the MVP.
-- Run after PostgreSQL + pgvector extension is available.
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- IDENTITY
-- ============================================================

CREATE TABLE tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    plan        VARCHAR(50) NOT NULL DEFAULT 'free',
    settings    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    avatar_url  VARCHAR(500),
    phone       VARCHAR(50),
    auth_id     VARCHAR(255) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(50) NOT NULL DEFAULT 'member',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id)
);

-- ============================================================
-- OPERATIONS (Core)
-- ============================================================

CREATE TABLE operation_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    icon            VARCHAR(50),
    fields          JSONB NOT NULL DEFAULT '[]',
    approval_rules  JSONB NOT NULL DEFAULT '[]',
    sla_hours       INTEGER DEFAULT 48,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE operations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    operation_type_id   UUID NOT NULL REFERENCES operation_types(id),
    requester_id        UUID NOT NULL REFERENCES users(id),
    title               VARCHAR(500) NOT NULL,
    data                JSONB NOT NULL DEFAULT '{}',
    status              VARCHAR(50) NOT NULL DEFAULT 'pending',
    current_approver_id UUID REFERENCES users(id),
    summary             TEXT,
    source              VARCHAR(50) NOT NULL DEFAULT 'web',
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE approvals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    operation_id    UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
    approver_id     UUID NOT NULL REFERENCES users(id),
    decision        VARCHAR(50),
    comment         TEXT,
    decided_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE timeline_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    operation_id    UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
    actor_id        UUID REFERENCES users(id),
    actor_type      VARCHAR(50) NOT NULL DEFAULT 'user',
    action          VARCHAR(100) NOT NULL,
    details         JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE operation_comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    operation_id    UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
    author_id       UUID NOT NULL REFERENCES users(id),
    body            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- COMMUNICATION
-- ============================================================

CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    operation_id    UUID REFERENCES operations(id) ON DELETE SET NULL,
    channel         VARCHAR(50) NOT NULL,
    direction       VARCHAR(10) NOT NULL,
    recipient_id    UUID REFERENCES users(id),
    content         JSONB NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'queued',
    external_id     VARCHAR(255),
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TRACKING
-- ============================================================

CREATE TABLE sla_instances (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    operation_id    UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
    deadline_at     TIMESTAMPTZ NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'active',
    reminded_count  INTEGER NOT NULL DEFAULT 0,
    last_reminded_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INTELLIGENCE
-- ============================================================

CREATE TABLE knowledge_entries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category            VARCHAR(100) NOT NULL,
    content             TEXT NOT NULL,
    embedding           vector(1536),
    source_operation_id UUID REFERENCES operations(id) ON DELETE SET NULL,
    confidence          DECIMAL(3,2) DEFAULT 0.80,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Identity
CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_tenant ON memberships(tenant_id);

-- Operations
CREATE INDEX idx_operation_types_tenant ON operation_types(tenant_id) WHERE is_active = true;
CREATE INDEX idx_operations_tenant_status ON operations(tenant_id, status);
CREATE INDEX idx_operations_tenant_requester ON operations(tenant_id, requester_id);
CREATE INDEX idx_operations_tenant_approver ON operations(tenant_id, current_approver_id) WHERE current_approver_id IS NOT NULL;
CREATE INDEX idx_operations_tenant_created ON operations(tenant_id, created_at DESC);
CREATE INDEX idx_operations_tenant_type ON operations(tenant_id, operation_type_id);
CREATE INDEX idx_approvals_tenant_approver_pending ON approvals(tenant_id, approver_id) WHERE decision IS NULL;
CREATE INDEX idx_approvals_operation ON approvals(operation_id);
CREATE INDEX idx_timeline_operation_time ON timeline_entries(operation_id, created_at DESC);
CREATE INDEX idx_comments_operation ON operation_comments(operation_id, created_at);

-- Communication
CREATE INDEX idx_messages_tenant_operation ON messages(tenant_id, operation_id);
CREATE INDEX idx_messages_tenant_channel ON messages(tenant_id, channel, created_at DESC);
CREATE INDEX idx_messages_external ON messages(external_id) WHERE external_id IS NOT NULL;

-- Tracking
CREATE INDEX idx_sla_active ON sla_instances(tenant_id, status, deadline_at) WHERE status = 'active';
CREATE INDEX idx_sla_operation ON sla_instances(operation_id);

-- Intelligence
CREATE INDEX idx_knowledge_tenant_category ON knowledge_entries(tenant_id, category);
CREATE INDEX idx_knowledge_embedding ON knowledge_entries USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all business tables
ALTER TABLE operation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;

-- Create policies: all tables filter by tenant_id matching the session variable
CREATE POLICY tenant_isolation ON operation_types
    FOR ALL USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation ON operations
    FOR ALL USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation ON approvals
    FOR ALL USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation ON timeline_entries
    FOR ALL USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation ON operation_comments
    FOR ALL USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation ON messages
    FOR ALL USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation ON sla_instances
    FOR ALL USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation ON knowledge_entries
    FOR ALL USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- ============================================================
-- HELPER FUNCTION: Set tenant context for the session
-- ============================================================

CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant', p_tenant_id::text, false);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operation_types_updated_at
    BEFORE UPDATE ON operation_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operations_updated_at
    BEFORE UPDATE ON operations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
