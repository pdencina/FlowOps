'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, Loader2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const supabase = createClient();

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, company },
      },
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    // 2. Create tenant + user + membership via API
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authId: authData.user?.id,
        name,
        email,
        company,
      }),
    });

    if (!res.ok) {
      setError('Error al crear la organización');
      setIsLoading(false);
      return;
    }

    router.push('/inbox');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="h-7 w-7 text-brand-600" />
            <span className="text-2xl font-bold">FlowOps</span>
          </div>
          <p className="text-gray-500 text-sm">
            Crea tu cuenta y organiza las operaciones de tu empresa.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            placeholder="Tu nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <Input
            placeholder="Nombre de tu empresa"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
          />
          <Input
            type="email"
            placeholder="tu@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Contraseña (min. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Crear cuenta
          </Button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          ¿Ya tienes cuenta?{' '}
          <a href="/auth/login" className="text-brand-600 hover:underline">
            Ingresar
          </a>
        </p>
      </div>
    </div>
  );
}
