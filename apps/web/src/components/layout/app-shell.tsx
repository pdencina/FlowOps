'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inbox, BarChart3, Settings, Plus, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { SessionUser } from '@/lib/auth';

interface AppShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

const navigation = [
  { name: 'Inbox', href: '/inbox', icon: Inbox },
  { name: 'Espacio', href: '/space', icon: BarChart3 },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
        {/* Logo */}
        <div className="flex h-14 items-center px-4 border-b border-gray-100">
          <Link href="/inbox" className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-brand-600" />
            <span className="font-semibold text-lg">FlowOps</span>
          </Link>
        </div>

        {/* New Operation button */}
        <div className="p-3">
          <Button asChild className="w-full">
            <Link href="/new">
              <Plus className="h-4 w-4 mr-2" />
              Nueva operación
            </Link>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            // Only show Space for admins
            if (item.href === '/space' && user.role !== 'admin') return null;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )}
              >
                <item.icon className={cn('h-4 w-4', isActive ? 'text-brand-600' : 'text-gray-400')} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
