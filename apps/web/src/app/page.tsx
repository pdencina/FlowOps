import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function Home() {
  const session = await getSession();
  if (session) redirect('/inbox');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <div className="text-center space-y-6 max-w-lg">
        <div className="flex items-center justify-center gap-2">
          <Zap className="h-8 w-8 text-brand-600" />
          <h1 className="text-4xl font-bold tracking-tight">FlowOps</h1>
        </div>
        <p className="text-lg text-gray-600">
          Nunca más preguntes: ¿en qué quedó esto?
        </p>
        <p className="text-sm text-gray-500">
          El lugar donde viven las operaciones de tu empresa.
          Compras, vacaciones, contratos, mantenciones — todo en un solo lugar.
        </p>
        <div className="flex gap-3 justify-center pt-4">
          <Button asChild size="lg">
            <Link href="/auth/signup">Crear cuenta gratis</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/auth/login">Ingresar</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
