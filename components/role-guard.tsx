'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppRole } from '@/lib/auth/roles';

// Guard de UX. La protección real está en middleware.ts y en las políticas RLS de Supabase.
export function RoleGuard({
  children,
  allowedRoles,
  title = 'Acceso restringido',
}: {
  children: React.ReactNode;
  allowedRoles: AppRole[];
  title?: string;
}) {
  const router = useRouter();
  const { user, status } = useAuth();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  if (status !== 'authenticated' || !user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-card">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">
          Este módulo no está disponible para tu perfil actual. Contacta a administración para solicitar acceso.
        </p>
        <Button className="mt-5" variant="outline" onClick={() => router.push('/')}>
          Volver al panel
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
