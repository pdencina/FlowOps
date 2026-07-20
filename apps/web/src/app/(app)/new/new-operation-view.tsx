'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface OperationType {
  id: string;
  name: string;
  icon: string | null;
  fields: any;
  description: string | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface NewOperationViewProps {
  types: OperationType[];
}

export function NewOperationView({ types }: NewOperationViewProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'chat' | 'form'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '¿Qué necesitas? Cuéntame con tus palabras y yo me encargo del resto.' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/operations/natural', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: userMessage }),
      });

      const { data } = await res.json();
      setAiResult(data);

      if (data.matched && data.confidence > 0.8) {
        if (data.missingFields?.length > 0) {
          const questions = data.missingFields
            .map((f: any) => `• ${f.question}`)
            .join('\n');
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `Entendido. Es una operación de **${data.operationTypeName}**: "${data.title}"\n\nMe falta saber:\n${questions}`,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `Perfecto. Voy a crear: **${data.title}** (${data.operationTypeName}). ¿Confirmas?`,
            },
          ]);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'No estoy seguro de cómo clasificar esto. ¿Puedes darme más detalles? ¿O prefieres usar el formulario?',
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Hubo un error. ¿Puedes intentar de nuevo?' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirm() {
    if (!aiResult?.operationTypeId) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationTypeId: aiResult.operationTypeId,
          title: aiResult.title,
          data: aiResult.extractedData || {},
        }),
      });

      if (res.ok) {
        const { data } = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: '✓ Operación creada. Redirigiendo...' },
        ]);
        setTimeout(() => router.push(`/operations/${data.id}`), 1000);
      }
    } finally {
      setIsLoading(false);
    }
  }

  // Chat mode
  if (mode === 'chat') {
    return (
      <div className="max-w-2xl mx-auto py-8 px-6 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href="/inbox"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Inbox
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Nueva operación</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setMode('form')}>
            <FileText className="h-4 w-4 mr-1" />
            Usar formulario
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto space-y-4 mb-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start',
              )}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                  msg.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md',
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {/* Confirm button when AI has all data */}
          {aiResult?.matched && aiResult?.confidence > 0.8 && !aiResult?.missingFields?.length && (
            <div className="flex justify-start">
              <Button onClick={handleConfirm} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Confirmar y crear
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe qué necesitas..."
            disabled={isLoading}
            className="flex-1"
            autoFocus
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    );
  }

  // Form mode (fallback)
  return <FormMode types={types} />;
}

// ---- Form Fallback ----

function FormMode({ types }: { types: OperationType[] }) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<OperationType | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedType || !title) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationTypeId: selectedType.id,
          title,
          data: formData,
        }),
      });

      if (res.ok) {
        const { data } = await res.json();
        router.push(`/operations/${data.id}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Type selection
  if (!selectedType) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-6">
        <Link
          href="/inbox"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Inbox
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mb-6">¿Qué tipo de operación?</h1>
        <div className="grid grid-cols-2 gap-3">
          {types.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type)}
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 text-left hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
            >
              <span className="text-2xl">{type.icon || '📋'}</span>
              <div>
                <p className="font-medium text-gray-900">{type.name}</p>
                {type.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Form
  const fields = (selectedType.fields as any[]) || [];

  return (
    <div className="max-w-2xl mx-auto py-8 px-6">
      <button
        onClick={() => setSelectedType(null)}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Cambiar tipo
      </button>

      <div className="flex items-center gap-2 mb-6">
        <span className="text-xl">{selectedType.icon || '📋'}</span>
        <h1 className="text-xl font-semibold text-gray-900">{selectedType.name}</h1>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Título de la operación *
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Compra de notebooks para ventas"
            required
          />
        </div>

        {fields.map((field: any) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && '*'}
            </label>
            {field.type === 'select' ? (
              <select
                className="flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm"
                value={formData[field.key] || ''}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                required={field.required}
              >
                <option value="">Seleccionar...</option>
                {field.options?.map((opt: string) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <Input
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                value={formData[field.key] || ''}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                placeholder={field.placeholder || ''}
                required={field.required}
              />
            )}
          </div>
        ))}

        <div className="pt-4">
          <Button type="submit" disabled={isSubmitting || !title}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Crear operación
          </Button>
        </div>
      </form>
    </div>
  );
}
