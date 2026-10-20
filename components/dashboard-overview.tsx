'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Clock,
  Columns3,
  Handshake,
  HandCoins,
  Heart,
  Inbox,
  Package,
  PartyPopper,
  PawPrint,
  Plus,
  RefreshCw,
  Scale,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { CashflowChart } from '@/components/finances/cashflow-chart';
import { AnimatedNumber } from '@/components/animated-number';
import { ModKey } from '@/components/mod-key';
import { StatCard } from '@/components/page-header';
import { PulseFactors, PulseRing, computePulse } from '@/components/shelter-pulse';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { STALE_AFTER_DAYS, adoptionStageVariant, daysSinceUpdate, isClosedStage, listAdoptions, type AdoptionRequest } from '@/lib/data/adoptions';
import { ANIMAL_STATUSES, animalStatusVariant, listAnimals, type Animal } from '@/lib/data/animals';
import { formatMoney, listTransactions, monthlyTotals, todayIso, totalsFor, type Transaction } from '@/lib/data/finances';
import { inventoryAlerts, listInventory, type InventoryItem } from '@/lib/data/inventory';
import { createClient } from '@/lib/supabase/client';
import { STAFF_ROLES } from '@/lib/auth/roles';

const STATUS_BAR: Record<string, string> = {
  Disponible: 'from-emerald-400 to-emerald-500',
  'En tratamiento': 'from-amber-400 to-orange-500',
  Reservado: 'from-sky-400 to-indigo-500',
  Adoptado: 'from-violet-400 to-fuchsia-500',
};

type Attention = { id: string; icon: LucideIcon; tone: string; text: string; href: string };

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function todayLabel() {
  const text = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function QuickLink({ href, icon: Icon, label, description }: { href: string; icon: LucideIcon; label: string; description: string }) {
  return (
    <Link href={href} className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border bg-card p-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/[0.05] to-primary/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div className="relative min-w-0 flex-1">
        <p className="font-semibold group-hover:text-primary">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

function Hero({ name, summary, children }: { name: string; summary: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-sidebar p-6 text-white shadow-lift sm:p-8">
      <div aria-hidden="true" className="animate-aurora pointer-events-none absolute -left-24 -top-32 h-80 w-80 rounded-full bg-sky-500/25 blur-3xl" />
      <div aria-hidden="true" className="animate-aurora pointer-events-none absolute -bottom-40 right-10 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl [animation-delay:-6s]" />
      <div aria-hidden="true" className="animate-aurora pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full bg-orange-400/15 blur-3xl [animation-delay:-12s]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.06)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-sky-200 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> {todayLabel()}
          </p>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {greeting()}, <span className="bg-gradient-to-r from-sky-300 via-indigo-300 to-orange-300 bg-clip-text text-transparent">{name}</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">{summary}</p>
          <p className="mt-4 hidden items-center gap-2 text-xs text-slate-400 sm:flex">
            Pulsa <kbd className="rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 font-semibold text-slate-200"><ModKey /> K</kbd> para buscar o actuar sin soltar el teclado.
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}

function VolunteerOverview({ name }: { name: string }) {
  return (
    <div className="space-y-6">
      <Hero name={name} summary="Gracias por apoyar a Huellitas. Cada turno que cubres cambia la vida de un animal. Esto es lo que puedes consultar hoy." />
      <section className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <QuickLink href="/agenda" icon={CalendarDays} label="Agenda" description="Citas y tareas programadas" />
        <QuickLink href="/voluntariado" icon={Handshake} label="Voluntariado" description="Turnos y equipos" />
        <QuickLink href="/eventos" icon={PartyPopper} label="Eventos" description="Ferias y campañas próximas" />
        <QuickLink href="/animales/seguimiento" icon={ClipboardList} label="Seguimiento" description="Bienestar de los animales" />
        <QuickLink href="/reportes" icon={AlertTriangle} label="Reportes" description="Reportes ciudadanos" />
      </section>
    </div>
  );
}

function StaffOverview({ name }: { name: string }) {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [adoptions, setAdoptions] = useState<AdoptionRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  // allSettled: si una tabla falla (p. ej. aún no se creó), el resto del panel sigue funcionando.
  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [a, i, ad, t] = await Promise.allSettled([listAnimals(supabase), listInventory(supabase), listAdoptions(supabase), listTransactions(supabase)]);
    if (a.status === 'fulfilled') setAnimals(a.value);
    if (i.status === 'fulfilled') setInventory(i.value);
    if (ad.status === 'fulfilled') setAdoptions(ad.value);
    if (t.status === 'fulfilled') setTransactions(t.value);
    setErrors(
      [a, i, ad, t].flatMap((result) => (result.status === 'rejected' ? [result.reason instanceof Error ? result.reason.message : 'Error al cargar datos.'] : [])).filter((m, idx, arr) => arr.indexOf(m) === idx),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sheltered = animals.filter((a) => a.status !== 'Adoptado');
  const available = animals.filter((a) => a.status === 'Disponible').length;
  const activeAdoptions = adoptions.filter((r) => !isClosedStage(r.stage));
  const staleAdoptions = activeAdoptions.filter((r) => daysSinceUpdate(r) >= STALE_AFTER_DAYS);

  const monthStart = `${todayIso().slice(0, 7)}-01`;
  const monthTotals = totalsFor(transactions.filter((t) => t.date >= monthStart && t.date <= todayIso()));
  const months = useMemo(() => monthlyTotals(transactions, 6), [transactions]);

  const attention = useMemo<Attention[]>(() => {
    const list: Attention[] = [];
    for (const alert of inventoryAlerts(inventory)) {
      list.push({ id: `inv-${alert.id}`, icon: Package, tone: alert.status === 'Caducado' || alert.status === 'Agotado' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700', text: alert.text, href: '/inventario' });
    }
    const fresh = adoptions.filter((r) => r.stage === 'Nueva').length;
    if (fresh) list.push({ id: 'adopt-new', icon: Inbox, tone: 'bg-sky-100 text-sky-700', text: `${fresh} ${fresh === 1 ? 'solicitud nueva espera' : 'solicitudes nuevas esperan'} revisión`, href: '/adopciones' });
    for (const request of staleAdoptions.slice(0, 3)) {
      list.push({ id: `stale-${request.id}`, icon: Clock, tone: 'bg-amber-100 text-amber-700', text: `${request.applicant_name} lleva ${daysSinceUpdate(request)} días en ${request.stage}`, href: '/adopciones/solicitudes' });
    }
    for (const animal of animals.filter((a) => a.status === 'En tratamiento').slice(0, 3)) {
      list.push({ id: `vet-${animal.id}`, icon: Stethoscope, tone: 'bg-violet-100 text-violet-700', text: `${animal.name} sigue en tratamiento`, href: `/animales/${animal.id}` });
    }
    return list;
  }, [inventory, adoptions, staleAdoptions, animals]);

  const pulse = useMemo(() => computePulse({ animals, inventory, adoptions, monthBalance: monthTotals.balance }), [animals, inventory, adoptions, monthTotals.balance]);

  const statusCounts = ANIMAL_STATUSES.map((status) => ({ status, count: animals.filter((a) => a.status === status).length }));
  const maxStatus = Math.max(1, ...statusCounts.map((s) => s.count));

  return (
    <div className="space-y-6">
      <Hero
        name={name}
        summary={
          loading ? (
            'Analizando el estado del refugio…'
          ) : (
            <>
              Hoy cuidas de <strong className="text-white">{sheltered.length} {sheltered.length === 1 ? 'animal' : 'animales'}</strong>, {available} {available === 1 ? 'listo' : 'listos'} para encontrar hogar
              {activeAdoptions.length ? (
                <>
                  {' '}y <strong className="text-white">{activeAdoptions.length} {activeAdoptions.length === 1 ? 'adopción' : 'adopciones'}</strong> en camino
                </>
              ) : null}
              .
            </>
          )
        }
      >
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur sm:flex-row lg:w-[500px] lg:shrink-0">
          {loading ? <div className="h-[148px] w-[148px] shrink-0 animate-pulse rounded-full border-[11px] border-white/10" /> : <PulseRing score={pulse.score} level={pulse.level} />}
          <div className="w-full min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="font-display text-sm font-bold">Pulso del refugio</p>
              <Button variant="ghost" size="icon" onClick={() => void load()} disabled={loading} aria-label="Recargar datos" className="h-7 w-7 text-slate-400 hover:bg-white/10 hover:text-white">
                <RefreshCw className={loading ? 'animate-spin' : undefined} />
              </Button>
            </div>
            <p className="mb-3 text-xs text-slate-400">Índice automático de 0 a 100. Esto es lo que lo baja:</p>
            {loading ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-5 animate-pulse rounded bg-white/10" />)}</div> : <PulseFactors pulse={pulse} />}
          </div>
        </div>
      </Hero>

      {errors.length ? (
        <Card className="border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Algunos datos no se pudieron cargar</p>
          <ul className="mt-1 list-disc pl-5">{errors.map((message) => <li key={message}>{message}</li>)}</ul>
        </Card>
      ) : null}

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label="En el refugio" value={loading ? '—' : sheltered.length} icon={PawPrint} tone="sky" hint={loading ? undefined : `${available} ${available === 1 ? 'disponible' : 'disponibles'} para adopción`} />
        <StatCard label="Adopciones en proceso" value={loading ? '—' : activeAdoptions.length} icon={Heart} tone="emerald" hint={loading ? undefined : staleAdoptions.length ? `${staleAdoptions.length} estancadas` : 'Ninguna estancada'} />
        <StatCard label="Alertas de inventario" value={loading ? '—' : inventoryAlerts(inventory).length} icon={Package} tone="amber" hint="Stock bajo o caducidad" />
        <StatCard
          label="Balance del mes"
          value={loading ? '—' : <span className={monthTotals.balance < 0 ? 'text-rose-700' : undefined}><AnimatedNumber value={monthTotals.balance} format={formatMoney} /></span>}
          icon={Scale}
          tone={monthTotals.balance < 0 ? 'rose' : 'violet'}
          hint={loading ? undefined : `${formatMoney(monthTotals.income)} recibidos`}
        />
      </section>

      <section className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QuickLink href="/animales?nuevo=1" icon={Plus} label="Registrar animal" description="Nuevo ingreso al refugio" />
        <QuickLink href="/adopciones?nuevo=1" icon={Heart} label="Nueva solicitud" description="Persona interesada en adoptar" />
        <QuickLink href="/donaciones?nuevo=1" icon={HandCoins} label="Registrar donación" description="Ingreso o gasto" />
        <QuickLink href="/inventario?nuevo=1" icon={Package} label="Agregar insumo" description="Alimento, medicina, material" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Requiere atención</CardTitle>
            <CardDescription>Pendientes detectados automáticamente</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
            ) : attention.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <PawPrint className="h-6 w-6" />
                </span>
                <p className="text-sm font-medium">Todo en orden por ahora</p>
                <p className="text-xs text-muted-foreground">Nada requiere tu atención. ¡Buen trabajo!</p>
              </div>
            ) : (
              <ul className="stagger space-y-2">
                {attention.slice(0, 8).map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="group flex items-center gap-3 rounded-xl border p-2.5 transition-all duration-200 hover:translate-x-1 hover:border-primary/40 hover:bg-muted/40">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.tone}`}>
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 text-sm">{item.text}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  </li>
                ))}
                {attention.length > 8 ? <li className="pt-1 text-xs text-muted-foreground">y {attention.length - 8} más…</li> : null}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Solicitudes activas</CardTitle>
              <CardDescription>Las más recientes del proceso de adopción</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/adopciones/solicitudes">
                <Columns3 /> Tablero
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
            ) : activeAdoptions.length === 0 ? (
              <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">No hay solicitudes en proceso.</p>
            ) : (
              <ul className="divide-y">
                {activeAdoptions.slice(0, 5).map((request) => (
                  <li key={request.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-xs font-bold text-white">
                      {request.applicant_name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{request.applicant_name}</p>
                      <p className="truncate text-xs text-muted-foreground">Quiere adoptar a {request.animal_name}</p>
                    </div>
                    <Badge variant={adoptionStageVariant(request.stage)}>{request.stage}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Finanzas</CardTitle>
              <CardDescription>Ingresos y gastos de los últimos 6 meses</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/donaciones">Ver detalle <ArrowRight /></Link>
            </Button>
          </CardHeader>
          <CardContent>{loading ? <Skeleton className="h-56 w-full" /> : <CashflowChart months={months} />}</CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Animales por estado</CardTitle>
              <CardDescription>{loading ? 'Cargando…' : `${animals.length} expedientes en total`}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/animales">Expedientes <ArrowRight /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <ul className="space-y-3.5">
                {statusCounts.map(({ status, count }) => (
                  <li key={status}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <Badge variant={animalStatusVariant(status)}>{status}</Badge>
                      <span className="font-semibold tabular-nums">{count}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div className={`grow-x h-full rounded-full bg-gradient-to-r ${STATUS_BAR[status] ?? 'from-slate-400 to-slate-500'}`} style={{ width: `${(count / maxStatus) * 100}%`, minWidth: count ? 6 : 0 }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function DashboardOverview() {
  const { user } = useAuth();
  const name = user?.name.split(' ')[0] ?? '';
  if (!user) return null;
  return STAFF_ROLES.includes(user.role) ? <StaffOverview name={name} /> : <VolunteerOverview name={name} />;
}
