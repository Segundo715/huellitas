import Link from 'next/link';
import { HeartHandshake, LogIn, PawPrint } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { Reveal } from '@/components/public/reveal';
import { ScrollProgress } from '@/components/public/scroll-progress';
import { ThemeToggle } from '@/components/theme-toggle';

// Marco de las páginas públicas: cabecera ligera y pie con contacto.
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <ScrollProgress />
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href="/adopta" className="flex items-center gap-2.5">
            <BrandLogo size={38} priority className="transition-transform duration-500 hover:rotate-[-12deg] hover:scale-110" />
            <span className="font-display text-lg font-extrabold tracking-tight">Huellitas</span>
          </Link>
          <nav aria-label="Principal" className="flex items-center gap-1 text-sm font-medium">
            <Link href="/adopta#animales" className="hidden rounded-lg px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground sm:block">Adopta</Link>
            <Link href="/adopta#como-adoptar" className="hidden rounded-lg px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground md:block">Cómo adoptar</Link>
            <Link href="/adopta#preguntas" className="hidden rounded-lg px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground md:block">Preguntas</Link>
            <ThemeToggle />
            <Link href="/login" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" title="Acceso para el equipo del refugio">
              <LogIn className="h-4 w-4" /> <span className="hidden sm:inline">Equipo</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-card/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <Reveal>
            <p className="flex items-center gap-2 font-display text-lg font-extrabold"><PawPrint className="h-5 w-5 animate-[wiggle_2.5s_ease-in-out_infinite] text-primary" /> Huellitas</p>
            <p className="mt-2 text-sm text-muted-foreground">Refugio de animales rescatados. Cada adopción abre un lugar para rescatar a alguien más.</p>
          </Reveal>
          <Reveal delay={120} className="text-sm">
            <p className="font-semibold">Visítanos</p>
            <p className="mt-2 text-muted-foreground">Martes a domingo, 10:00 a 17:00.</p>
            <p className="text-muted-foreground">Las visitas para conocer a un animal se agendan después de enviar tu solicitud.</p>
          </Reveal>
          <Reveal delay={240} className="text-sm">
            <p className="font-semibold">Otras formas de ayudar</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li className="flex items-center gap-2"><HeartHandshake className="h-4 w-4 text-primary" /> Comparte sus perfiles en redes</li>
              <li className="flex items-center gap-2"><HeartHandshake className="h-4 w-4 text-primary" /> Hazte voluntario de paseos</li>
              <li className="flex items-center gap-2"><HeartHandshake className="h-4 w-4 text-primary" /> Dona alimento o medicinas</li>
            </ul>
          </Reveal>
        </div>
        <p className="border-t py-4 text-center text-xs text-muted-foreground">
          Hecho con <PawPrint aria-label="cariño" className="inline h-3.5 w-3.5 text-primary" /> por el equipo de Huellitas · Fotos de Wikimedia Commons con licencia libre
        </p>
      </footer>
    </div>
  );
}
