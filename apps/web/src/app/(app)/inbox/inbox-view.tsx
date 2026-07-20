'use client';

import Link from 'next/link';
import { Inbox as InboxIcon, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/format';

interface Operation {
  id: string;
  title: string;
  status: string;
  source: string;
  createdAt: Date;
  requesterName?: string;
  typeName: string;
  typeIcon: string | null;
}

interface InboxViewProps {
  forYou: Operation[];
  mine: Operation[];
  overdue: Operation[];
  userName: string;
}

export function InboxView({ forYou, mine, overdue, userName }: InboxViewProps) {
  const firstName = userName.split(' ')[0];

  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Hola, {firstName}
        </h1>
        <p className="text-gray-500 mt-1">
          {forYou.length > 0
            ? `Tienes ${forYou.length} operación${forYou.length > 1 ? 'es' : ''} esperando tu acción.`
            : 'Todo al día. No tienes pendientes.'}
        </p>
      </div>

      {/* Overdue section */}
      {overdue.length > 0 && (
        <Section
          title="Atrasadas"
          icon={AlertTriangle}
          iconColor="text-red-500"
          count={overdue.length}
        >
          {overdue.map((op) => (
            <OperationRow key={op.id} operation={op} variant="overdue" />
          ))}
        </Section>
      )}

      {/* For you section */}
      {forYou.length > 0 && (
        <Section
          title="Para ti"
          icon={InboxIcon}
          iconColor="text-brand-600"
          count={forYou.length}
        >
          {forYou.map((op) => (
            <OperationRow key={op.id} operation={op} variant="pending" />
          ))}
        </Section>
      )}

      {/* My operations */}
      <Section
        title="Tus operaciones"
        icon={Clock}
        iconColor="text-gray-400"
        count={mine.length}
      >
        {mine.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Sin operaciones"
            description="Cuando crees una operación, aparecerá aquí para que puedas hacer seguimiento."
          />
        ) : (
          mine.map((op) => (
            <OperationRow key={op.id} operation={op} variant="mine" />
          ))
        )}
      </Section>
    </div>
  );
}

// ---- Section Component ----

function Section({
  title,
  icon: Icon,
  iconColor,
  count,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn('h-4 w-4', iconColor)} />
        <h2 className="text-sm font-medium text-gray-700">{title}</h2>
        <span className="text-xs text-gray-400">({count})</span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

// ---- Operation Row Component ----

function OperationRow({
  operation,
  variant,
}: {
  operation: Operation;
  variant: 'pending' | 'overdue' | 'mine';
}) {
  const statusBadge = getStatusBadge(operation.status);

  return (
    <Link
      href={`/operations/${operation.id}`}
      className={cn(
        'flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-gray-50 group',
        variant === 'overdue' && 'bg-red-50/50 hover:bg-red-50',
      )}
    >
      {/* Icon */}
      <span className="text-lg flex-shrink-0">{operation.typeIcon || '📋'}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-brand-700">
          {operation.title}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {operation.typeName}
          {operation.requesterName && ` · ${operation.requesterName}`}
        </p>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant={statusBadge.variant as any}>{statusBadge.label}</Badge>
        <span className="text-xs text-gray-400">{formatRelativeTime(operation.createdAt)}</span>
      </div>
    </Link>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'awaiting_approval':
      return { label: 'Pendiente', variant: 'pending' };
    case 'approved':
      return { label: 'Aprobada', variant: 'approved' };
    case 'rejected':
      return { label: 'Rechazada', variant: 'rejected' };
    case 'completed':
      return { label: 'Completada', variant: 'approved' };
    case 'cancelled':
      return { label: 'Cancelada', variant: 'default' };
    default:
      return { label: status, variant: 'default' };
  }
}
