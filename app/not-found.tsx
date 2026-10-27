import type { Metadata } from 'next';
import Link from 'next/link';
import { PawPrint } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Página no encontrada', robots: { index: false } };

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center">
      <BrandLogo size={72} priority />
      <p className="mt-8 flex items-center gap-2 font-display text-6xl font-extrabold tracking-tight text-primary">
        4<PawPrint aria-hidden="true" className="h-12 w-12 animate-[wiggle_2.5s_ease-in-out_infinite]" />4
      </p>
      <h1 className="mt-4 font-display text-2xl font-extrabold sm:text-3xl">Esta huella no lleva a ningún lado</h1>
      <p className="mt-2 max-w-md text-muted-foreground">La página que buscas no existe o cambió de lugar. Revisa el enlace o vuelve al inicio.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/adopta">Ver animales en adopción</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Ir al panel del refugio</Link>
        </Button>
      </div>
    </main>
  );
}
