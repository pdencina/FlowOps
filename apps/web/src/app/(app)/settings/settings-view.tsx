'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

interface OperationType {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  fields: any;
  approvalRules: any;
  slaHours: number | null;
  isActive: boolean;
  createdAt: Date;
}

interface SettingsViewProps {
  types: OperationType[];
}

export function SettingsView({ types }: SettingsViewProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  async function handleCreateNatural() {
    if (!description.trim()) return;
    setIsCreating(true);

    try {
      // For MVP: use a simple structured approach
      // In future: AI generates full type from description
      const res = await fetch('/api/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: description.trim(),
          fields: [],
          approvalRules: [],
          slaHours: 48,
        }),
      });

      if (res.ok) {
        setDescription('');
        setShowCreate(false);
        router.refresh();
      }
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Configuración</h1>
          <p className="text-gray-500 mt-1">Administra los tipos de operación de tu empresa.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo tipo
        </Button>
      </div>

      {/* Create new type */}
      {showCreate && (
        <Card className="mb-6 border-brand-200">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Crear nuevo tipo de operación</h3>
            <p className="text-xs text-gray-500 mb-3">
              Describe qué tipo de operación quieres crear. Por ejemplo: "Solicitudes de vacaciones", "Compras de oficina", "Reclamos de clientes".
            </p>
            <div className="flex gap-2">
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Ej: "Solicitudes de reembolso"'
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateNatural()}
              />
              <Button onClick={handleCreateNatural} disabled={isCreating || !description.trim()}>
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear'}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Types list */}
      {types.length === 0 ? (
        <EmptyState
          icon={SettingsIcon}
          title="Sin tipos de operación"
          description="Crea tu primer tipo de operación para que tu equipo pueda empezar a trabajar."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Crear tipo
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {types.map((type) => (
            <Card key={type.id} className="hover:border-gray-300 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{type.icon || '📋'}</span>
                    <div>
                      <p className="font-medium text-gray-900">{type.name}</p>
                      {type.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={type.isActive ? 'active' : 'default'}>
                      {type.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {(type.fields as any[])?.length || 0} campos · SLA {type.slaHours}h
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
