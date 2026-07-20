'use client';

import Link from 'next/link';
import { BarChart3, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

interface SpaceViewProps {
  metrics: {
    totalThisMonth: number;
    pending: number;
    overdue: number;
  };
  activeOperations: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: Date;
    requesterName: string;
    typeName: string;
    typeIcon: string | null;
    approverName: string | null;
  }>;
}

export function SpaceView({ metrics, activeOperations }: SpaceViewProps) {
  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Espacio</h1>
        <p className="text-gray-500 mt-1">Vista general de las operaciones de tu empresa.</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <MetricCard
          label="Creadas este mes"
          value={metrics.totalThisMonth}
          icon={TrendingUp}
          iconColor="text-brand-600"
        />
        <MetricCard
          label="Pendientes"
          value={metrics.pending}
          icon={Clock}
          iconColor="text-yellow-600"
        />
        <MetricCard
          label="Atrasadas"
          value={metrics.overdue}
          icon={AlertTriangle}
          iconColor="text-red-600"
          highlight={metrics.overdue > 0}
        />
      </div>

      {/* AI Insight (placeholder for now) */}
      {metrics.overdue > 0 && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Atención:</span> {metrics.overdue} operación{metrics.overdue > 1 ? 'es' : ''} {metrics.overdue > 1 ? 'llevan' : 'lleva'} más tiempo del esperado sin resolverse.
              Las aprobaciones que más se atrasan son las de montos altos.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Active operations */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 mb-3">Operaciones activas</h2>
        <div className="space-y-1">
          {activeOperations.map((op) => (
            <Link
              key={op.id}
              href={`/operations/${op.id}`}
              className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <span className="text-lg flex-shrink-0">{op.typeIcon || '📋'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{op.title}</p>
                <p className="text-xs text-gray-500">
                  {op.requesterName} → {op.approverName || 'Sin asignar'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="pending">Pendiente</Badge>
                <span className="text-xs text-gray-400">{formatRelativeTime(op.createdAt)}</span>
              </div>
            </Link>
          ))}

          {activeOperations.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">No hay operaciones activas.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  iconColor,
  highlight = false,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(highlight && 'border-red-200 bg-red-50/30')}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={cn('h-4 w-4', iconColor)} />
          <span className="text-xs text-gray-500">{label}</span>
        </div>
        <p className={cn('text-2xl font-semibold', highlight ? 'text-red-700' : 'text-gray-900')}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
