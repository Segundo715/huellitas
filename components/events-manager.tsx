'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, CalendarPlus, Clock, Goal, Loader2, MapPin, MoreHorizontal, PartyPopper, PencilLine, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { PageHeader, StatCard } from '@/components/page-header';
import { EmptyState, ErrorBanner, FieldError } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { STAFF_ROLES } from '@/lib/auth/roles';
import { EVENT_TYPES, daysUntilEvent, emptyEventForm, eventFormSchema, eventStore, eventToForm, eventTypeStyle, type EventFormValues, type ShelterEvent } from '@/lib/data/events';
import { formatMoney } from '@/lib/data/finances';
import { fieldErrors, formatTime } from '@/lib/data/table-store';
import { createClient } from '@/lib/supabase/client';
import { useCreateParam } from '@/lib/use-create-param';
import { cn } from '@/lib/utils';

type Errors = Partial<Record<keyof EventFormValues, string>>;

function EventFormDialog({ open, onOpenChange, event, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; event: ShelterEvent | null; onSaved: (event: ShelterEvent) => void }) {
  const [form, setForm] = useState<EventFormValues>(emptyEventForm);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(event ? eventToForm(event) : emptyEventForm());
      setErrors({});
    }
  }, [open, event]);

  const set = (field: keyof EventFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (submit: React.FormEvent<HTMLFormElement>) => {
    submit.preventDefault();
    const parsed = eventFormSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors<keyof EventFormValues>(parsed.error.issues));
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const saved = event ? await eventStore.update(supabase, event.id, parsed.data) : await eventStore.create(supabase, parsed.data);
      toast.success(event ? 'Evento actualizado' : `«${saved.title}» publicado`);
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{event ? 'Editar evento' : 'Nuevo evento'}</DialogTitle>
          <DialogDescription>Ferias, jornadas de salud, colectas y actividades con la comunidad.</DialogDescription>
        </DialogHeader>
        <form id="event-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ev-title">Nombre *</Label>
            <Input id="ev-title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ej. Feria de adopción de primavera" aria-invalid={Boolean(errors.title)} />
            <FieldError message={errors.title} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-type">Tipo</Label>
            <NativeSelect id="ev-type" value={form.type} onChange={(e) => set('type', e.target.value)}>
              {EVENT_TYPES.map((type) => <option key={type}>{type}</option>)}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-date">Fecha *</Label>
            <Input id="ev-date" type="date" value={form.event_date} onChange={(e) => set('event_date', e.target.value)} aria-invalid={Boolean(errors.event_date)} />
            <FieldError message={errors.event_date} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-start">Inicio</Label>
            <Input id="ev-start" type="time" value={form.start_time} onChange={(e) => set('start_time', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-end">Fin</Label>
            <Input id="ev-end" type="time" value={form.end_time} onChange={(e) => set('end_time', e.target.value)} aria-invalid={Boolean(errors.end_time)} />
            <FieldError message={errors.end_time} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-location">Lugar</Label>
            <Input id="ev-location" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Dirección o sede" />
            <FieldError message={errors.location} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-goal">Meta de recaudación (MXN)</Label>
            <Input id="ev-goal" type="number" min="0" step="100" inputMode="decimal" value={form.fundraising_goal} onChange={(e) => set('fundraising_goal', e.target.value)} placeholder="Opcional" aria-invalid={Boolean(errors.fundraising_goal)} />
            <FieldError message={errors.fundraising_goal} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ev-description">Descripción</Label>
            <Textarea id="ev-description" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Qué se hará, a quién va dirigido, qué llevar…" />
            <FieldError message={errors.description} />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="event-form" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            {event ? 'Guardar cambios' : 'Publicar evento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function countdown(days: number) {
  if (days === 0) return '¡Es hoy!';
  if (days === 1) return 'Mañana';
  if (days < 0) return `Hace ${-days} días`;
  return `En ${days} días`;
}

function EventCard({ event, canManage, onEdit, onDelete }: { event: ShelterEvent; canManage: boolean; onEdit: () => void; onDelete: () => void }) {
  const style = eventTypeStyle(event.type);
  const days = daysUntilEvent(event.event_date);
  const [y, m, d] = event.event_date.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const past = days < 0;
  return (
    <article className={cn('group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift', past && 'opacity-70')}>
      <div className={cn('relative flex items-end justify-between bg-gradient-to-br p-4 text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.25)]', style.gradient)}>
        <div>
          <p className="font-display text-4xl font-extrabold leading-none">{date.getDate()}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/85">{date.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')} · {date.toLocaleDateString('es-MX', { month: 'long' })}</p>
        </div>
        <span className={cn('rounded-full bg-black/25 px-2.5 py-1 text-xs font-semibold backdrop-blur', days === 0 && 'animate-pulse bg-[#fff] text-[#0f172a]')}>{countdown(days)}</span>
        {canManage ? (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-8 w-8 text-white hover:bg-white/20 hover:text-white" aria-label={`Acciones para ${event.title}`}><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}><PencilLine /> Editar</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:bg-rose-50 focus:text-destructive"><Trash2 /> Eliminar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <Badge variant={style.badge} className="w-fit">{event.type}</Badge>
        <h3 className="mt-2 font-display text-lg font-bold leading-snug">{event.title}</h3>
        {event.description ? <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{event.description}</p> : null}
        <div className="mt-auto space-y-1.5 pt-4 text-sm text-muted-foreground">
          {event.start_time ? (
            <p className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0" /> {formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}</p>
          ) : null}
          {event.location ? (
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary hover:underline">
              <MapPin className="h-4 w-4 shrink-0" /> {event.location}
            </a>
          ) : null}
          {event.fundraising_goal ? <p className="flex items-center gap-2 font-medium text-foreground"><Goal className="h-4 w-4 shrink-0 text-amber-600" /> Meta: {formatMoney(event.fundraising_goal)}</p> : null}
        </div>
      </div>
    </article>
  );
}

export function EventsManager() {
  const { user } = useAuth();
  const canManage = Boolean(user && STAFF_ROLES.includes(user.role));
  const [events, setEvents] = useState<ShelterEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showPast, setShowPast] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ShelterEvent | null>(null);
  const [deleting, setDeleting] = useState<ShelterEvent | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEvents(await eventStore.list(createClient()));
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los eventos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const { upcoming, past } = useMemo(() => {
    const sorted = [...events].sort((a, b) => a.event_date.localeCompare(b.event_date));
    return { upcoming: sorted.filter((e) => daysUntilEvent(e.event_date) >= 0), past: sorted.filter((e) => daysUntilEvent(e.event_date) < 0).reverse() };
  }, [events]);

  const next = upcoming[0];
  const thisMonth = upcoming.filter((e) => daysUntilEvent(e.event_date) <= 30).length;
  const goals = upcoming.reduce((sum, e) => sum + (e.fundraising_goal ?? 0), 0);

  const upsert = (saved: ShelterEvent) => setEvents((current) => (current.some((e) => e.id === saved.id) ? current.map((e) => (e.id === saved.id ? saved : e)) : [...current, saved]));

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await eventStore.remove(createClient(), deleting.id);
      setEvents((current) => current.filter((e) => e.id !== deleting.id));
      toast.success('Evento eliminado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar.');
    }
  };

  const openCreate = () => {
    if (!canManage) return;
    setEditing(null);
    setFormOpen(true);
  };
  useCreateParam(openCreate);

  const grid = (list: ShelterEvent[]) => (
    <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {list.map((event) => (
        <EventCard key={event.id} event={event} canManage={canManage} onEdit={() => { setEditing(event); setFormOpen(true); }} onDelete={() => setDeleting(event)} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Eventos"
        title="Agenda y actividades"
        description="Ferias de adopción, jornadas de salud y campañas con la comunidad."
        actions={
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading} aria-label="Recargar">
              <RefreshCw className={loading ? 'animate-spin' : undefined} />
            </Button>
            {canManage ? <Button onClick={openCreate}><CalendarPlus /> Nuevo evento</Button> : null}
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
        <StatCard label="Próximo evento" value={loading ? '—' : next ? countdown(daysUntilEvent(next.event_date)) : 'Ninguno'} icon={CalendarClock} tone="sky" hint={next?.title} />
        <StatCard label="En los próximos 30 días" value={loading ? '—' : thisMonth} icon={PartyPopper} tone="violet" />
        <StatCard label="Metas de recaudación" value={loading ? '—' : goals ? formatMoney(goals) : '—'} icon={Goal} tone="amber" hint="Suma de eventos próximos" />
      </section>

      {loadError ? <ErrorBanner message={loadError} /> : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)}</div>
      ) : upcoming.length === 0 ? (
        <Card>
          <EmptyState
            icon={PartyPopper}
            title="No hay eventos próximos"
            description={canManage ? 'Organiza una feria de adopción o una jornada de salud.' : 'Cuando el equipo publique uno, aparecerá aquí.'}
            action={canManage ? <Button onClick={openCreate}><CalendarPlus /> Nuevo evento</Button> : undefined}
          />
        </Card>
      ) : (
        grid(upcoming)
      )}

      {past.length ? (
        <section className="space-y-4">
          <Button variant="ghost" onClick={() => setShowPast((v) => !v)} className="px-0 text-muted-foreground hover:bg-transparent hover:text-foreground">
            {showPast ? 'Ocultar' : 'Ver'} eventos pasados ({past.length})
          </Button>
          {showPast ? grid(past) : null}
        </section>
      ) : null}

      <EventFormDialog open={formOpen} onOpenChange={setFormOpen} event={editing} onSaved={upsert} />
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="¿Eliminar este evento?"
        description={`Se borrará «${deleting?.title ?? ''}». Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
