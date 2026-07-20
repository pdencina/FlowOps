import 'dotenv/config';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://flowops:flowops_dev@localhost:5432/flowops';
const sql = postgres(connectionString);

async function seed() {
  console.log('🌱 Seeding database...');

  // Clean existing data (in reverse dependency order)
  await sql`DELETE FROM knowledge_entries`;
  await sql`DELETE FROM sla_instances`;
  await sql`DELETE FROM messages`;
  await sql`DELETE FROM operation_comments`;
  await sql`DELETE FROM timeline_entries`;
  await sql`DELETE FROM approvals`;
  await sql`DELETE FROM operations`;
  await sql`DELETE FROM operation_types`;
  await sql`DELETE FROM memberships`;
  await sql`DELETE FROM users`;
  await sql`DELETE FROM tenants`;

  // ---- Tenant ----
  const [tenant] = await sql`
    INSERT INTO tenants (id, name, slug, plan, settings)
    VALUES (
      'a0000000-0000-0000-0000-000000000001',
      'Empresa Demo',
      'empresa-demo',
      'pro',
      '{"whatsappEnabled": true, "defaultSlaHours": 48, "timezone": "America/Santiago"}'::jsonb
    )
    RETURNING id
  `;

  // ---- Users ----
  const [adminUser] = await sql`
    INSERT INTO users (id, email, name, phone, auth_id)
    VALUES (
      'b0000000-0000-0000-0000-000000000001',
      'roberto@empresa-demo.com',
      'Roberto García',
      '+56912345678',
      'auth_roberto_001'
    )
    RETURNING id
  `;

  const [approverUser] = await sql`
    INSERT INTO users (id, email, name, phone, auth_id)
    VALUES (
      'b0000000-0000-0000-0000-000000000002',
      'carla@empresa-demo.com',
      'Carla Mendoza',
      '+56987654321',
      'auth_carla_002'
    )
    RETURNING id
  `;

  const [memberUser] = await sql`
    INSERT INTO users (id, email, name, phone, auth_id)
    VALUES (
      'b0000000-0000-0000-0000-000000000003',
      'juan@empresa-demo.com',
      'Juan Pérez',
      '+56911111111',
      'auth_juan_003'
    )
    RETURNING id
  `;

  // ---- Memberships ----
  await sql`
    INSERT INTO memberships (tenant_id, user_id, role) VALUES
    (${tenant.id}, ${adminUser.id}, 'admin'),
    (${tenant.id}, ${approverUser.id}, 'approver'),
    (${tenant.id}, ${memberUser.id}, 'member')
  `;

  // ---- Operation Types ----
  const [purchaseType] = await sql`
    INSERT INTO operation_types (id, tenant_id, name, description, icon, fields, approval_rules, sla_hours)
    VALUES (
      'c0000000-0000-0000-0000-000000000001',
      ${tenant.id},
      'Compras',
      'Solicitudes de compra de bienes y servicios',
      '🛒',
      ${sql.json([
        { key: 'item', label: 'Qué se necesita', type: 'text', required: true },
        { key: 'amount', label: 'Monto estimado', type: 'number', required: true },
        { key: 'supplier', label: 'Proveedor sugerido', type: 'text', required: false },
        { key: 'urgency', label: 'Urgencia', type: 'select', required: true, options: ['baja', 'media', 'alta', 'crítica'] }
      ])},
      ${sql.json([
        { condition: { field: 'amount', operator: 'lt', value: 500 }, approverId: approverUser.id, order: 1 },
        { condition: { field: 'amount', operator: 'gte', value: 500 }, approverId: adminUser.id, order: 1 }
      ])},
      48
    )
    RETURNING id
  `;

  const [vacationType] = await sql`
    INSERT INTO operation_types (id, tenant_id, name, description, icon, fields, approval_rules, sla_hours)
    VALUES (
      'c0000000-0000-0000-0000-000000000002',
      ${tenant.id},
      'Vacaciones',
      'Solicitudes de días libres y vacaciones',
      '🏖️',
      ${sql.json([
        { key: 'start_date', label: 'Fecha inicio', type: 'date', required: true },
        { key: 'end_date', label: 'Fecha fin', type: 'date', required: true },
        { key: 'days', label: 'Días solicitados', type: 'number', required: true },
        { key: 'reason', label: 'Motivo', type: 'text', required: false }
      ])},
      ${sql.json([
        { approverId: approverUser.id, order: 1 }
      ])},
      72
    )
    RETURNING id
  `;

  // ---- Operations (sample) ----
  // Operation 1: Pending approval (purchase)
  const [op1] = await sql`
    INSERT INTO operations (id, tenant_id, operation_type_id, requester_id, title, data, status, current_approver_id, source)
    VALUES (
      'd0000000-0000-0000-0000-000000000001',
      ${tenant.id},
      ${purchaseType.id},
      ${memberUser.id},
      'Compra de 3 notebooks para equipo de ventas',
      ${sql.json({ item: '3 notebooks Lenovo ThinkPad', amount: 4500, supplier: 'TechStore', urgency: 'media' })},
      'awaiting_approval',
      ${adminUser.id},
      'web'
    )
    RETURNING id
  `;

  // Operation 2: Approved (vacation)
  const [op2] = await sql`
    INSERT INTO operations (id, tenant_id, operation_type_id, requester_id, title, data, status, source, resolved_at)
    VALUES (
      'd0000000-0000-0000-0000-000000000002',
      ${tenant.id},
      ${vacationType.id},
      ${memberUser.id},
      'Vacaciones enero 2025',
      ${sql.json({ start_date: '2025-01-15', end_date: '2025-01-22', days: 5, reason: 'Vacaciones familiares' })},
      'approved',
      'whatsapp',
      now()
    )
    RETURNING id
  `;

  // Operation 3: Pending (small purchase)
  const [op3] = await sql`
    INSERT INTO operations (id, tenant_id, operation_type_id, requester_id, title, data, status, current_approver_id, source)
    VALUES (
      'd0000000-0000-0000-0000-000000000003',
      ${tenant.id},
      ${purchaseType.id},
      ${memberUser.id},
      'Compra de toners para impresora piso 2',
      ${sql.json({ item: '3 toners HP LaserJet', amount: 150, supplier: '', urgency: 'baja' })},
      'awaiting_approval',
      ${approverUser.id},
      'web'
    )
    RETURNING id
  `;

  // ---- Timeline Entries ----
  await sql`
    INSERT INTO timeline_entries (tenant_id, operation_id, actor_id, actor_type, action, details) VALUES
    (${tenant.id}, ${op1.id}, ${memberUser.id}, 'user', 'created', '{"source": "web"}'::jsonb),
    (${tenant.id}, ${op1.id}, NULL, 'system', 'submitted', '{"approver": "Roberto García"}'::jsonb),
    (${tenant.id}, ${op2.id}, ${memberUser.id}, 'user', 'created', '{"source": "whatsapp"}'::jsonb),
    (${tenant.id}, ${op2.id}, ${approverUser.id}, 'user', 'approved', '{"comment": "Aprobado, que descanse!"}'::jsonb),
    (${tenant.id}, ${op3.id}, ${memberUser.id}, 'user', 'created', '{"source": "web"}'::jsonb)
  `;

  // ---- Approvals ----
  await sql`
    INSERT INTO approvals (tenant_id, operation_id, approver_id, decision, comment, decided_at) VALUES
    (${tenant.id}, ${op2.id}, ${approverUser.id}, 'approved', 'Aprobado, que descanse!', now())
  `;

  // Pending approval for op1
  await sql`
    INSERT INTO approvals (tenant_id, operation_id, approver_id) VALUES
    (${tenant.id}, ${op1.id}, ${adminUser.id}),
    (${tenant.id}, ${op3.id}, ${approverUser.id})
  `;

  // ---- SLA Instances ----
  await sql`
    INSERT INTO sla_instances (tenant_id, operation_id, deadline_at, status) VALUES
    (${tenant.id}, ${op1.id}, now() - interval '1 day', 'breached'),
    (${tenant.id}, ${op3.id}, now() + interval '1 day', 'active')
  `;

  console.log('✅ Seed complete!');
  console.log('');
  console.log('📊 Created:');
  console.log('   - 1 tenant (Empresa Demo)');
  console.log('   - 3 users (Roberto/admin, Carla/approver, Juan/member)');
  console.log('   - 2 operation types (Compras, Vacaciones)');
  console.log('   - 3 operations (1 awaiting, 1 approved, 1 awaiting)');
  console.log('   - Timeline entries and approvals');
  console.log('   - SLA instances');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
