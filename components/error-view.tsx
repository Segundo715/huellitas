'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Pantalla amable cuando una página falla de forma inesperada.
export function ErrorView({ error, reset, homeHref, homeLabel }: { error: Error & { digest?: string }; reset: () => void; homeHref: string; homeLabel: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center animate-in fade-in-0 zoom-in-95 duration-500">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-rose-600 dark:text-rose-400">
        <TriangleAlert aria-hidden="true" className="h-8 w-8" />
      </span>
      <h1 className="mt-4 font-display text-2xl font-extrabold sm:text-3xl">Algo salió mal</h1>
      <p className="mt-2 text-muted-foreground">
        No pudimos mostrar esta página. Puede ser un problema de conexión; inténtalo de nuevo en un momento.
      </p>
      {error.digest ? <p className="mt-3 font-mono text-xs text-muted-foreground">Código: {error.digest}</p> : null}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>
          <RotateCcw /> Reintentar
        </Button>
        <Button variant="outline" asChild>
          <Link href={homeHref}>{homeLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
