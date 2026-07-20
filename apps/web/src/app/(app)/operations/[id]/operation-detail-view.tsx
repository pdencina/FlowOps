'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, X, MessageSquare, Clock, User, Bot, Cog } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { formatRelativeTime, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

interface OperationDetailViewProps {
  operation: {
    id: string;
    title: string;
    status: string;
    data: any;
    summary: string | null;
    source: string;
    currentApproverId: string | null;
    createdAt: Date;
    resolvedAt: Date | null;
    requesterName: string;
    requesterId: string;
    typeName: string;
    typeIcon: string | null;
    typeFields: any;
  };
  timeline: Array<{
    id: string;
    actorType: string;
    action: string;
    details: any;
    createdAt: Date;
    actorName: string | null;
  }>;
  canApprove: boolean;
  currentUserId: string;
}

export function OperationDetailView({ operation, timeline, canApprove, currentUserId }: OperationDetailViewProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);

  async function handleApproval(decision: 'approved' | 'rejected') {
    setIsSubmitting(true);
    try {
      await fetch(`/api/operations/${operation.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, comment: comment || undefined }),
      });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  const statusBadge = getStatusVariant(operation.status);

  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      {/* Back + Header */}
      <div className="mb-6">
        <Link
          href="/inbox"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Inbox
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{operation.typeIcon || '📋'}</span>
              <span className="text-sm text-gray-500">{operation.typeName}</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">{operation.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Creada por {operation.requesterName} · {formatRelativeTime(operation.createdAt)}
            </p>
          </div>
          <Badge variant={statusBadge as any}>{getStatusLabel(operation.status)}</Badge>
        </div>
      </div>

      {/* AI Summary */}
      {operation.summary && (
        <Card className="mb-6 border-brand-100 bg-brand-50/30">
          <CardContent className="p-4">
            <p className="text-sm text-gray-700">{operation.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Data */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Datos de la operación</h3>
          <div className="space-y-2">
            {Object.entries(operation.data as Record<string, any>).map(([key, value]) => {
              const field = (operation.typeFields as any[])?.find((f) => f.key === key);
              return (
                <div key={key} className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-500">{field?.label || key}</span>
                  <span className="text-sm font-medium text-gray-900">{String(value)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Historial</h3>
        <div className="space-y-3">
          {timeline.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3">
              <div className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0',
                entry.actorType === 'system' ? 'bg-gray-100' :
                entry.actorType === 'ai' ? 'bg-purple-100' : 'bg-brand-100',
              )}>
                {entry.actorType === 'system' ? <Cog className="h-3.5 w-3.5 text-gray-500" /> :
                 entry.actorType === 'ai' ? <Bot className="h-3.5 w-3.5 text-purple-600" /> :
                 <User className="h-3.5 w-3.5 text-brand-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{entry.actorName || 'Sistema'}</span>
                  {' '}
                  {getActionLabel(entry.action)}
                </p>
                {entry.details?.comment && (
                  <p className="text-sm text-gray-500 mt-0.5 italic">"{entry.details.comment}"</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(entry.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {canApprove && (
        <Card className="border-brand-200">
          <CardContent className="p-4">
            {showCommentInput && (
              <div className="mb-3">
                <Textarea
                  placeholder="Agrega un comentario (opcional)..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="mb-2"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="success"
                onClick={() => handleApproval('approved')}
                disabled={isSubmitting}
              >
                <Check className="h-4 w-4 mr-1" />
                Aprobar
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleApproval('rejected')}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-1" />
                Rechazar
              </Button>
              {!showCommentInput && (
                <Button
                  variant="outline"
                  onClick={() => setShowCommentInput(true)}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Comentar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'awaiting_approval': return 'pending';
    case 'approved': return 'approved';
    case 'rejected': return 'rejected';
    case 'completed': return 'approved';
    default: return 'default';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'awaiting_approval': return 'Pendiente';
    case 'approved': return 'Aprobada';
    case 'rejected': return 'Rechazada';
    case 'completed': return 'Completada';
    case 'cancelled': return 'Cancelada';
    default: return status;
  }
}

function getActionLabel(action: string) {
  switch (action) {
    case 'created': return 'creó la operación';
    case 'submitted': return 'envió para aprobación';
    case 'approved': return 'aprobó la operación';
    case 'rejected': return 'rechazó la operación';
    case 'commented': return 'comentó';
    case 'reminded': return 'envió un recordatorio';
    case 'escalated': return 'escaló la operación';
    case 'completed': return 'marcó como completada';
    case 'cancelled': return 'canceló la operación';
    default: return action;
  }
}
