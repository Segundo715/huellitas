'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlarmClock, ArrowRight, CalendarX, CheckCircle2, Flame, HeartCrack, Package, RefreshCw, ShieldAlert, Siren, type LucideIcon } from 'lucide-react';
import { FilterChip, PageHeader, StatCard } from '@/components/page-header';
import { EmptyState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { STALE_AFTER_DAYS, daysSinceUpdate, isClosedStage, listAdoptions } from '@/lib/data/adoptions';
import { agendaStore, isClosedEntry } from '@/lib/data/agenda';
import { careStore, formatDue } from '@/lib/data/care';
import { inventoryAlerts, listInventory } from '@/lib/data/inventory';
import { isOpenReport, reportStore, timeAgo } from '@/lib/data/reports';
import { formatDayLabel, localTodayIso } from '@/lib/data/table-store';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type Level = 'Alta' | 'Media' | 'Baja';
type Alert = { id: string; level: Level; area: string; icon: LucideIcon; title: string; detail: string; href: string };

const LEVEL_ORDER: Record<Level, number> = { Alta: 0, Media: 1, Baja: 2 };
const levelStyle: Record<Level, { badge: 'danger' | 'warning' | 'info'; icon: string }> = {
  Alta: { badge: 'danger', icon: 'bg-rose-50 text-rose-600' },
  Media: { badge: 'warning', icon: 'bg-amber-50 text-amber-700' },
  Baja: { badge: 'info', icon: 'bg-sky-50 text-sky-700' },
};

// Junta lo que necesita atención en todo el refugio. Cada fuente es independiente:
// si una falla (p. ej. falta una tabla), las demás se muestran igual.
async function collectAlerts(): Promise<{ alerts: Alert[]; failed: string[] }> {
  const supabase = createClient();
  const today = localTodayIso();
  const failed: string[] = [];
  const safe = async <T,>(label: string, task: Promise<T>, fallback: T) => task.catch(() => (failed.push(label), fallback));

  const [inventory, care, reports, adoptions, agenda] = await Promise.all([
    safe('inventario', listInventory(supabase), []),
    safe('seguimiento', careStore.list(supabase), []),
    safe('reportes', reportStore.list(supabase), []),
    safe('adopciones', listAdoptions(supabase), []),
    safe('agenda', agendaStore.list(supabase), []),
  ]);

  const alerts: Alert[] = [];

  for (const item of inventoryAlerts(inventory)) {
    const critical = item.status === 'Caducado' || item.status === 'Agotado';
    alerts.push({ id: `inv-${item.id}`, level: critical ? 'Alta' : 'Media', area: 'Inventario', icon: Package, title: item.status, detail: item.text, href: '/inventario' });
  }

  const now = new Date();
  for (const reminder of care) {
    if (reminder.status === 'Completada') continue;
    const due = new Date(reminder.due_at);
    if (due < now) {
      const hours = (now.getTime() - due.getTime()) / 3_600_000;
      alerts.push({ id: `care-${reminder.id}`, level: hours > 24 ? 'Alta' : 'Media', area: 'Seguimiento', icon: AlarmClock, title: `${reminder.task} vencido`, detail: `${reminder.animal_name} · ${formatDue(reminder.due_at)}`, href: '/animales/seguimiento' });
    }
  }

  for (const report of reports) {
    if (!isOpenReport(report)) continue;
    if (report.priority === 'Alta' || report.status === 'Pendiente') {
      alerts.push({ id: `rep-${report.id}`, level: report.priority === 'Alta' ? 'Alta' : 'Media', area: 'Reportes', icon: Siren, title: `${report.type}${report.status === 'Pendiente' ? ' sin revisar' : ' en atención'}`, detail: `${report.address ?? 'Ubicación GPS'} · ${timeAgo(report.created_at)}`, href: '/reportes' });
    }
  }

  for (const request of adoptions) {
    if (isClosedStage(request.stage)) continue;
    const days = daysSinceUpdate(request);
    if (days >= STALE_AFTER_DAYS) {
      alerts.push({ id: `adop-${request.id}`, level: days >= STALE_AFTER_DAYS * 2 ? 'Media' : 'Baja', area: 'Adopciones', icon: HeartCrack, title: 'Solicitud estancada', detail: `${request.applicant_name} → ${request.animal_name} · ${days} días en «${request.stage}»`, href: '/adopciones/solicitudes' });
    }
  }

  for (const entry of agenda) {
    if (!isClosedEntry(entry) && entry.date < today) {
      alerts.push({ id: `ag-${entry.id}`, level: 'Baja', area: 'Agenda', icon: CalendarX, title: 'Cita sin cerrar', detail: `${entry.title} · ${formatDayLabel(entry.date)}`, href: '/agenda' });
    }
  }

  alerts.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
  return { alerts, failed };
}

export function AlertsCenter() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [failed, setFailed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [area, setArea] = useState('Todas');

  const load = useCallback(async () => {
    setLoading(true);
    const result = await collectAlerts();
    setAlerts(result.alerts);
    setFailed(result.failed);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const areas = useMemo(() => ['Todas', ...new Set(alerts.map((a) => a.area))], [alerts]);
  const visible = alerts.filter((a) => area === 'Todas' || a.area === area);
  const count = (level: Level) => alerts.filter((a) => a.level === level).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Alertas"
        title="Centro de incidencias"
        description="Todo lo que necesita atención en el refugio, ordenado por urgencia."
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading} aria-label="Recargar">
            <RefreshCw className={loading ? 'animate-spin' : undefined} />
          </Button>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Urgentes" value={loading ? '—' : count('Alta')} icon={Flame} tone={count('Alta') ? 'rose' : 'emerald'} />
        <StatCard label="Importantes" value={loading ? '—' : count('Media')} icon={ShieldAlert} tone="amber" />
        <StatCard label="Para revisar" value={loading ? '—' : count('Baja')} icon={AlarmClock} tone="sky" />
        <StatCard label="Áreas afectadas" value={loading ? '—' : areas.length - 1} icon={Siren} tone="violet" hint="de 5 que se vigilan" />
      </section>

      {failed.length ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No se pudo revisar: {failed.join(', ')}. El resto de alertas está completo.
        </p>
      ) : null}

      <Card>
        {areas.length > 2 ? (
          <div className="flex gap-2 overflow-x-auto border-b p-4">
            {areas.map((option) => (
              <FilterChip key={option} active={area === option} onClick={() => setArea(option)}>
                {option}
                {option !== 'Todas' ? ` · ${alerts.filter((a) => a.area === option).length}` : ''}
              </FilterChip>
            ))}
          </div>
        ) : null}
        {loading ? (
          <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : visible.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Todo en orden" description="No hay incidencias abiertas. ¡Buen trabajo, equipo! 🐾" />
        ) : (
          <ul className="divide-y">
            {visible.map((alert) => {
              const style = levelStyle[alert.level];
              const Icon = alert.icon;
              return (
                <li key={alert.id}>
                  <Link href={alert.href} className="group flex items-center gap-4 p-4 transition hover:bg-muted/50">
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', style.icon)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{alert.title}</p>
                      <p className="truncate text-sm text-muted-foreground">{alert.detail}</p>
                    </div>
                    <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                      <Badge variant={style.badge}>{alert.level}</Badge>
                      <span className="text-xs text-muted-foreground">{alert.area}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
