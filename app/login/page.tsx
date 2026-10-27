import type { Metadata } from 'next';
import Link from 'next/link';
import { ClipboardCheck, Command, HeartHandshake, Package, PawPrint } from 'lucide-react';
import { AuthForm } from '@/components/auth-form';
import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = { title: 'Iniciar sesión' };

const highlights = [
  { icon: PawPrint, title: 'Expedientes completos', text: 'Fotos, historial médico y estado de cada animal.' },
  { icon: Package, title: 'Inventario inteligente', text: 'Alertas automáticas de stock bajo y caducidad.' },
  { icon: HeartHandshake, title: 'Adopciones y Pulso del refugio', text: 'Tablero por etapas y un índice de salud en tiempo real.' },
  { icon: Command, title: 'Paleta de comandos', text: 'Busca «gatos en tratamiento» y actúa con Ctrl K.' },
  { icon: ClipboardCheck, title: 'Roles y permisos', text: 'Admin, operador y voluntario con accesos distintos.' },
];

// Huellas flotantes decorativas: posición, tamaño, giro, retraso y opacidad.
const paws = [
  { top: '5%', left: '84%', size: 30, r: 20, delay: 0, o: 0.1 },
  { top: '24%', left: '91%', size: 22, r: -15, delay: -2, o: 0.08 },
  { top: '46%', left: '93%', size: 26, r: 30, delay: -4, o: 0.07 },
  { top: '68%', left: '90%', size: 20, r: -25, delay: -1, o: 0.09 },
  { top: '88%', left: '80%', size: 32, r: 10, delay: -5, o: 0.08 },
  { top: '92%', left: '50%', size: 22, r: -35, delay: -3, o: 0.06 },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* Fondo con aurora animada */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="animate-aurora absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-sky-400/25 blur-3xl dark:bg-sky-500/20" />
        <div className="animate-aurora absolute -bottom-48 -right-32 h-[34rem] w-[34rem] rounded-full bg-indigo-400/20 blur-3xl [animation-delay:-7s] dark:bg-indigo-500/20" />
        <div className="animate-aurora absolute left-1/2 top-1/3 h-72 w-72 rounded-full bg-orange-300/20 blur-3xl [animation-delay:-13s] dark:bg-orange-500/10" />
        <div className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      <ThemeToggle className="absolute right-4 top-4 border bg-card/70 backdrop-blur" />

      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border bg-card/80 shadow-[0_30px_100px_-20px_hsl(var(--shadow-color)/0.35)] backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-700 lg:grid-cols-[1fr_1.1fr]">
        <div className="relative hidden overflow-hidden bg-sidebar p-10 text-white lg:flex lg:flex-col">
          <div aria-hidden="true" className="animate-aurora absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-500/30 blur-3xl" />
          <div aria-hidden="true" className="animate-aurora absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl [animation-delay:-8s]" />
          {paws.map((paw, index) => (
            <PawPrint
              key={index}
              aria-hidden="true"
              className="animate-float-paw absolute text-white"
              style={{ top: paw.top, left: paw.left, width: paw.size, height: paw.size, animationDelay: `${paw.delay}s`, ['--r' as string]: `${paw.r}deg`, ['--o' as string]: paw.o }}
            />
          ))}

          <div className="relative flex items-center gap-3">
            <BrandLogo size={52} priority className="shadow-sky-500/30" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-sky-300">Huellitas</p>
              <p className="font-display text-lg font-bold">Centro de control</p>
            </div>
          </div>

          <h1 className="relative mt-10 font-display text-4xl font-extrabold leading-[1.1] tracking-tight">
            Todo el refugio,
            <br />
            <span className="bg-gradient-to-r from-sky-300 via-indigo-300 to-orange-300 bg-clip-text text-transparent">en un solo panel.</span>
          </h1>
          <p className="relative mt-3 max-w-sm text-sm text-slate-400">Menos tiempo en hojas de cálculo, más tiempo encontrando hogares.</p>

          <ul className="stagger relative mt-8 space-y-4">
            {highlights.map(({ icon: Icon, title, text }) => (
              <li key={title} className="group flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition group-hover:border-sky-400/40 group-hover:bg-sky-400/10">
                  <Icon aria-hidden="true" className="h-5 w-5 text-sky-300" />
                </div>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-slate-400">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center p-6 sm:p-10">
          <div className="w-full">
            <AuthForm next={next} initialError={error} />
            <Link href="/adopta" className="group mt-6 flex items-center justify-between gap-3 rounded-2xl border border-dashed p-4 text-sm transition hover:border-primary/40 hover:bg-accent/50">
              <span>
                <span className="font-semibold">¿Quieres adoptar?</span>
                <span className="block text-muted-foreground">No necesitas cuenta: conoce a los animales del refugio.</span>
              </span>
              <PawPrint aria-hidden="true" className="h-5 w-5 shrink-0 text-primary transition group-hover:rotate-12" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
