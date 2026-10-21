'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Bell, Database, FlaskConical, Keyboard, LogOut, Menu, Monitor, Moon, PawPrint, Search, Sun, X } from 'lucide-react';
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { BrandLogo } from '@/components/brand-logo';
import { CommandPalette } from '@/components/command-palette';
import { useTheme } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { ModKey } from '@/components/mod-key';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getRoleLabel, STAFF_ROLES, type AppRole } from '@/lib/auth/roles';
import { inventoryAlerts, listInventory } from '@/lib/data/inventory';
import { isActivePath, visibleSections } from '@/lib/navigation';
import { createClient } from '@/lib/supabase/client';
import { useHotkeys } from '@/lib/use-hotkeys';
import { cn } from '@/lib/utils';

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Logo({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/" onClick={onNavigate} className="group mb-7 flex items-center gap-3 px-2">
      <BrandLogo size={44} priority className="shadow-sky-500/30 transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-105" />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-sky-300/90">Huellitas</p>
        <p className="font-display font-bold text-white">Centro de control</p>
      </div>
    </Link>
  );
}

function Sidebar({ role, pathname, onNavigate, mode, onOpenPalette }: { role: AppRole; pathname: string; onNavigate?: () => void; mode: 'demo' | 'supabase'; onOpenPalette: () => void }) {
  // Un solo indicador que se desliza hasta la sección activa.
  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState<{ top: number; ready: boolean } | null>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const place = (animate: boolean) => {
      const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active) {
        setIndicator(null);
        return;
      }
      const top = active.offsetTop + active.offsetHeight / 2 - 10;
      // La primera vez se coloca sin animar; después, se desliza.
      setIndicator((current) => (current?.top === top ? current : { top, ready: animate && current !== null }));
    };
    place(true);
    // Si cambia el alto de algo (fuentes, logo, ancho de ventana), se recoloca sin animación.
    const observer = new ResizeObserver(() => place(false));
    nav?.querySelectorAll(':scope > div').forEach((section) => observer.observe(section));
    void document.fonts?.ready.then(() => place(false));
    return () => observer.disconnect();
  }, [pathname, role]);

  return (
    <div className="relative flex h-full flex-col">
      {/* Resplandores decorativos */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative">
        <Logo onNavigate={onNavigate} />

        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            onOpenPalette();
          }}
          className="mb-6 flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-400 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-slate-200"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Buscar…</span>
          <kbd className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400"><ModKey /> K</kbd>
        </button>
      </div>

      <nav ref={navRef} className="relative -mx-2 flex-1 space-y-6 overflow-y-auto px-2" aria-label="Principal">
        {indicator ? (
          <span
            aria-hidden="true"
            className={cn('absolute left-2 z-10 h-5 w-[3px] rounded-full bg-gradient-to-b from-sky-300 to-indigo-400 shadow-[0_0_10px_rgb(56_189_248/0.7)]', indicator.ready && 'transition-[top] duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)]')}
            style={{ top: indicator.top }}
          />
        ) : null}
        {visibleSections(role).map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{section.title}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200',
                      active ? 'bg-gradient-to-r from-white/[0.12] to-white/[0.03] text-white' : 'text-slate-400 hover:translate-x-0.5 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    <Icon aria-hidden="true" className={cn('h-4 w-4 shrink-0 transition-all duration-300', active ? 'scale-110 text-sky-300' : 'group-hover:-rotate-6 group-hover:scale-110 group-hover:text-sky-300')} />
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut ? (
                      <span className="hidden text-[10px] font-semibold tracking-wider text-slate-600 opacity-0 transition group-hover:opacity-100 xl:inline">G {item.shortcut}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <span className="relative flex h-2 w-2">
            <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', mode === 'supabase' ? 'bg-emerald-400' : 'bg-amber-400')} />
            <span className={cn('relative inline-flex h-2 w-2 rounded-full', mode === 'supabase' ? 'bg-emerald-400' : 'bg-amber-400')} />
          </span>
          {mode === 'supabase' ? <Database className="h-3.5 w-3.5 text-emerald-400" /> : <FlaskConical className="h-3.5 w-3.5 text-amber-400" />}
          {mode === 'supabase' ? 'Conectado a Supabase' : 'Modo demo'}
        </div>
        <p className="mt-1 text-slate-400">{mode === 'supabase' ? 'Datos y sesión en la nube.' : 'Datos guardados en este navegador.'}</p>
      </div>
    </div>
  );
}

// Muestra un aviso cuando el middleware redirige por falta de permisos (?denied=/ruta).
function DeniedNotice() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const denied = searchParams.get('denied');

  useEffect(() => {
    if (denied) {
      toast.error('No tienes permiso para abrir esa sección.');
      router.replace('/');
    }
  }, [denied, router]);

  return null;
}

function ShortcutsHelp() {
  const rows: Array<[string[], string]> = [
    [['Ctrl/⌘', 'K'], 'Abrir la paleta de comandos'],
    [['/'], 'Buscar rápidamente'],
    [['G', 'D'], 'Ir al dashboard'],
    [['G', 'A'], 'Ir a expedientes'],
    [['G', 'I'], 'Ir a inventario'],
    [['G', 'S'], 'Ir a solicitudes'],
    [['G', 'F'], 'Ir a donaciones'],
  ];
  return (
    <div className="space-y-1.5 px-2.5 pb-2 text-xs">
      {rows.map(([keys, label]) => (
        <div key={label} className="flex items-center justify-between gap-3 text-muted-foreground">
          <span>{label}</span>
          <span className="flex gap-1">{keys.map((key) => <kbd key={key} className="kbd">{key}</kbd>)}</span>
        </div>
      ))}
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, status, mode, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [alerts, setAlerts] = useState<ReturnType<typeof inventoryAlerts>>([]);

  const isStaff = user ? STAFF_ROLES.includes(user.role) : false;

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Alertas reales derivadas del inventario (stock bajo, caducidad).
  useEffect(() => {
    if (!isStaff) return;
    listInventory(createClient())
      .then((items) => setAlerts(inventoryAlerts(items)))
      .catch(() => setAlerts([]));
  }, [isStaff, pathname]);

  const goTo = useCallback(
    (key: string) => {
      if (!user) return;
      const target = visibleSections(user.role)
        .flatMap((section) => section.items)
        .find((item) => item.shortcut === key);
      if (target) router.push(target.href);
    },
    [user, router],
  );

  useHotkeys({ onPalette: () => setPaletteOpen((open) => !open), onGoTo: goTo });

  if (status !== 'authenticated' || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <BrandLogo size={72} priority className="animate-pulse shadow-glow" />
        <p className="text-sm text-muted-foreground">Preparando tu panel…</p>
      </div>
    );
  }

  const criticalAlerts = alerts.filter((alert) => alert.status === 'Caducado' || alert.status === 'Agotado').length;

  return (
    <div className="min-h-screen">
      <Suspense fallback={null}>
        <DeniedNotice />
      </Suspense>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 overflow-hidden border-r border-white/5 bg-sidebar p-5 lg:block">
        <Sidebar role={user.role} pathname={pathname} mode={mode} onOpenPalette={() => setPaletteOpen(true)} />
      </aside>

      <div
        className={cn('fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden', mobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0')}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={cn('fixed inset-y-0 left-0 z-50 w-72 overflow-hidden bg-sidebar p-5 shadow-2xl transition-transform duration-300 ease-out lg:hidden', mobileMenuOpen ? 'translate-x-0' : '-translate-x-full')}
        aria-hidden={!mobileMenuOpen}
        inert={!mobileMenuOpen}
      >
        <button onClick={() => setMobileMenuOpen(false)} className="absolute right-4 top-5 z-10 rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Cerrar menú">
          <X className="h-4 w-4" />
        </button>
        <Sidebar role={user.role} pathname={pathname} mode={mode} onNavigate={() => setMobileMenuOpen(false)} onOpenPalette={() => setPaletteOpen(true)} />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menú">
              <Menu />
            </Button>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="group flex h-10 min-w-0 max-w-md flex-1 items-center gap-3 rounded-xl border bg-card/60 px-3 text-sm text-muted-foreground shadow-sm transition hover:border-primary/40 hover:bg-card hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Abrir buscador y comandos"
            >
              <Search className="h-4 w-4 transition-colors group-hover:text-primary" />
              <span className="flex-1 truncate text-left">{isStaff ? 'Buscar animales, secciones o acciones…' : 'Buscar secciones o acciones…'}</span>
              <span className="hidden items-center gap-1 sm:flex">
                <kbd className="kbd"><ModKey /></kbd>
                <kbd className="kbd">K</kbd>
              </span>
            </button>

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              {mode === 'demo' ? <Badge variant="warning" className="hidden sm:inline-flex">Demo</Badge> : null}

              <ThemeToggle />

              {isStaff ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative" aria-label={`Alertas (${alerts.length})`}>
                      <Bell className={alerts.length ? 'origin-top animate-[wiggle_1s_ease-in-out_2]' : undefined} />
                      {alerts.length ? (
                        <span className={cn('absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-background', criticalAlerts ? 'bg-destructive' : 'bg-amber-500')}>
                          {alerts.length}
                        </span>
                      ) : null}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel className="flex items-center justify-between font-semibold">
                      Alertas de inventario
                      {alerts.length ? <Badge variant={criticalAlerts ? 'danger' : 'warning'}>{alerts.length}</Badge> : null}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {alerts.length ? (
                      alerts.slice(0, 8).map((alert) => (
                        <DropdownMenuItem key={alert.id} asChild>
                          <Link href="/inventario" className="items-start">
                            <AlertTriangle className={cn('mt-0.5', alert.status === 'Caducado' || alert.status === 'Agotado' ? 'text-destructive' : 'text-amber-600')} />
                            <span className="whitespace-normal">{alert.text}</span>
                          </Link>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <p className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground"><PawPrint className="h-4 w-4 text-primary" /> Todo en orden</p>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-xs font-bold text-white shadow-sm">
                      {initialsOf(user.name)}
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-400" />
                    </span>
                    <span className="hidden text-left text-sm leading-tight md:block">
                      <span className="block font-semibold">{user.name}</span>
                      <span className="block text-xs text-muted-foreground">{getRoleLabel(user.role)}</span>
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel>
                    <p className="font-semibold">{user.name}</p>
                    <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Apariencia</p>
                  <div className="grid grid-cols-3 gap-1 px-1 pb-1">
                    {([
                      ['light', 'Claro', Sun],
                      ['dark', 'Oscuro', Moon],
                      ['system', 'Sistema', Monitor],
                    ] as const).map(([value, label, Icon]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={(event) => setTheme(value, { x: event.clientX, y: event.clientY })}
                        aria-pressed={theme === value}
                        className={cn(
                          'flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium transition',
                          theme === value ? 'border-primary/50 bg-primary/10 text-foreground' : 'border-transparent text-muted-foreground hover:bg-muted',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                  <DropdownMenuSeparator />
                  <p className="flex items-center gap-1.5 px-2.5 pb-1.5 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Keyboard className="h-3 w-3" /> Atajos
                  </p>
                  <ShortcutsHelp />
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void signOut()} className="text-destructive focus:bg-rose-50 focus:text-destructive">
                    <LogOut /> Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main key={pathname} className="animate-page mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
