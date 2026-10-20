'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, CalendarDays, CalendarPlus, CheckCircle2, Clock, ListTodo, Loader2, MoreHorizontal, PawPrint, PencilLine, Plus, RefreshCw, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { FilterChip, PageHeader, StatCard } from '@/components/page-header';
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
import {
  AGENDA_STATUSES,
  AGENDA_TYPES,
  agendaFormSchema,
  agendaStore,
  agendaToForm,
  agendaTypeStyle,
  emptyAgendaForm,
  isClosedEntry,
  sortAgenda,
  type AgendaEntry,
  type AgendaFormValues,
} from '@/lib/data/agenda';
import { listAnimals, type Animal } from '@/lib/data/animals';
import { addDaysIso, fieldErrors, formatDayLabel, formatTime, localTodayIso } from '@/lib/data/table-store';
import { createClient } from '@/lib/supabase/client';
import { useCreateParam } from '@/lib/use-create-param';
import { cn } from '@/lib/utils';

type Errors = Partial<Record<keyof AgendaFormValues, string>>;
const VIEWS = ['Próximas', 'Pasadas', 'Todas'] as const;

function AgendaFormDialog({
  open,
  onOpenChange,
  entry,
  animals,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: AgendaEntry | null;
  animals: Animal[];
  onSaved: (entry: AgendaEntry) => void;
}) {
  const [form, setForm] = useState<AgendaFormValues>(emptyAgendaForm);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(entry ? agendaToForm(entry) : emptyAgendaForm());
      setErrors({});
    }
  }, [open, entry]);

  const set = (field: keyof AgendaFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = agendaFormSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors<keyof AgendaFormValues>(parsed.error.issues));
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const saved = entry ? await agendaStore.update(supabase, entry.id, parsed.data) : await agendaStore.create(supabase, parsed.data);
      toast.success(entry ? 'Cita actualizada' : `«${saved.title}» agendada para ${formatDayLabel(saved.date).toLowerCase()}`);
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
          <DialogTitle>{entry ? 'Editar cita' : 'Nueva cita o tarea'}</DialogTitle>
          <DialogDescription>Citas de adopción, visitas veterinarias, eventos o pendientes del equipo.</DialogDescription>
        </DialogHeader>
        <form id="agenda-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ag-title">Asunto *</Label>
            <Input id="ag-title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ej. Visita veterinaria de Rocky" aria-invalid={Boolean(errors.title)} />
            <FieldError message={errors.title} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ag-date">Fecha *</Label>
            <Input id="ag-date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} aria-invalid={Boolean(errors.date)} />
            <FieldError message={errors.date} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ag-time">Hora</Label>
            <Input id="ag-time" type="time" value={form.time} onChange={(e) => set('time', e.target.value)} aria-invalid={Boolean(errors.time)} />
            <FieldError message={errors.time} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ag-type">Tipo</Label>
            <NativeSelect id="ag-type" value={form.type} onChange={(e) => set('type', e.target.value)}>
              {AGENDA_TYPES.map((type) => <option key={type}>{type}</option>)}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ag-status">Estado</Label>
            <NativeSelect id="ag-status" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {AGENDA_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ag-assignee">Responsable</Label>
            <Input id="ag-assignee" value={form.assignee} onChange={(e) => set('assignee', e.target.value)} placeholder="Quién se encarga" />
            <FieldError message={errors.assignee} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ag-animal">Animal vinculado</Label>
            <NativeSelect id="ag-animal" value={form.animal_id} onChange={(e) => set('animal_id', e.target.value)} disabled={animals.length === 0}>
              <option value="">{animals.length ? 'Ninguno' : 'Sin acceso a expedientes'}</option>
              {animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.name} · {animal.type}</option>)}
            </NativeSelect>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ag-notes">Notas</Label>
            <Textarea id="ag-notes" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Detalles, dirección, qué llevar…" />
            <FieldError message={errors.notes} />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="agenda-form" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            {entry ? 'Guardar cambios' : 'Agendar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AgendaManager() {
  const [entries, setEntries] = useState<AgendaEntry[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState<(typeof VIEWS)[number]>('Próximas');
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AgendaEntry | null>(null);
  const [deleting, setDeleting] = useState<AgendaEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      setEntries(sortAgenda(await agendaStore.list(supabase)));
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudo cargar la agenda.');
    } finally {
      setLoading(false);
    }
    // Los voluntarios no ven expedientes: la agenda funciona igual, solo sin vincular animales.
    listAnimals(supabase).then(setAnimals, () => setAnimals([]));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const today = localTodayIso();
  const weekEnd = addDaysIso(7);
  const animalName = useMemo(() => new Map(animals.map((animal) => [animal.id, animal.name])), [animals]);

  const stats = useMemo(() => {
    const open = entries.filter((entry) => !isClosedEntry(entry));
    return {
      today: open.filter((entry) => entry.date === today).length,
      week: open.filter((entry) => entry.date >= today && entry.date <= weekEnd).length,
      overdue: open.filter((entry) => entry.date < today).length,
      done: entries.filter((entry) => entry.status === 'Completada').length,
    };
  }, [entries, today, weekEnd]);

  const groups = useMemo(() => {
    const visible = entries.filter((entry) => {
      if (typeFilter !== 'Todos' && entry.type !== typeFilter) return false;
      if (view === 'Próximas') return entry.date >= today || !isClosedEntry(entry);
      if (view === 'Pasadas') return entry.date < today;
      return true;
    });
    const ordered = view === 'Pasadas' ? [...visible].reverse() : visible;
    const map = new Map<string, AgendaEntry[]>();
    for (const entry of ordered) map.set(entry.date, [...(map.get(entry.date) ?? []), entry]);
    return [...map.entries()];
  }, [entries, typeFilter, view, today]);

  const upsert = (saved: AgendaEntry) => setEntries((current) => sortAgenda(current.some((e) => e.id === saved.id) ? current.map((e) => (e.id === saved.id ? saved : e)) : [...current, saved]));

  const complete = async (entry: AgendaEntry) => {
    try {
      upsert(await agendaStore.update(createClient(), entry.id, { status: 'Completada' }));
      toast.success(`«${entry.title}» completada`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar.');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await agendaStore.remove(createClient(), deleting.id);
      setEntries((current) => current.filter((e) => e.id !== deleting.id));
      toast.success('Cita eliminada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar.');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  useCreateParam(openCreate);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Agenda"
        title="Citas y tareas"
        description="Lo que tiene el equipo por delante: adopciones, salud, eventos y pendientes."
        actions={
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading} aria-label="Recargar">
              <RefreshCw className={loading ? 'animate-spin' : undefined} />
            </Button>
            <Button onClick={openCreate}>
              <CalendarPlus /> Nueva cita
            </Button>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Hoy" value={loading ? '—' : stats.today} icon={CalendarDays} tone="sky" hint="Pendientes del día" />
        <StatCard label="Próximos 7 días" value={loading ? '—' : stats.week} icon={CalendarCheck} tone="violet" />
        <StatCard label="Atrasadas" value={loading ? '—' : stats.overdue} icon={Clock} tone={stats.overdue ? 'rose' : 'emerald'} hint={stats.overdue ? 'Fecha pasada sin cerrar' : 'Todo al día'} />
        <StatCard label="Completadas" value={loading ? '—' : stats.done} icon={CheckCircle2} tone="emerald" />
      </section>

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {VIEWS.map((option) => (
              <FilterChip key={option} active={view === option} onClick={() => setView(option)}>{option}</FilterChip>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {['Todos', ...AGENDA_TYPES].map((type) => (
              <FilterChip key={type} active={typeFilter === type} onClick={() => setTypeFilter(type)}>
                {type === 'Todos' ? 'Todos los tipos' : type}
              </FilterChip>
            ))}
          </div>
        </div>

        {loadError ? (
          <ErrorBanner message={loadError} className="m-4" />
        ) : loading ? (
          <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title={entries.length ? 'Nada en esta vista' : 'La agenda está vacía'}
            description={entries.length ? 'Cambia el filtro para ver otras citas.' : 'Agenda la primera cita o tarea del equipo.'}
            action={<Button onClick={openCreate}><Plus /> Nueva cita</Button>}
          />
        ) : (
          <div className="divide-y">
            {groups.map(([date, items]) => (
              <section key={date} className="p-4 sm:p-5">
                <h2 className={cn('mb-3 flex items-center gap-2 text-sm font-semibold', date === today ? 'text-primary' : date < today ? 'text-muted-foreground' : 'text-foreground')}>
                  {date === today ? <span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> : null}
                  {formatDayLabel(date)}
                  <span className="font-normal text-muted-foreground">· {items.length}</span>
                </h2>
                <ul className="space-y-2">
                  {items.map((entry) => {
                    const style = agendaTypeStyle(entry.type);
                    const closed = isClosedEntry(entry);
                    const overdue = !closed && entry.date < today;
                    return (
                      <li key={entry.id} className={cn('group flex items-start gap-3 rounded-xl border bg-card p-3 transition hover:border-primary/30 hover:shadow-card', closed && 'opacity-60', overdue && 'border-rose-200 bg-rose-50/40')}>
                        <div className={cn('flex w-14 shrink-0 flex-col items-center rounded-lg py-1.5 text-xs font-semibold tabular-nums', style.tile)}>
                          {entry.time ? formatTime(entry.time) : <span className="text-[10px] uppercase">Todo el día</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={cn('font-semibold', closed && 'line-through')}>{entry.title}</p>
                            <Badge variant={style.badge}>{entry.type}</Badge>
                            {overdue ? <Badge variant="danger">Atrasada</Badge> : entry.status !== 'Programada' ? <Badge variant={closed ? 'neutral' : 'outline'}>{entry.status}</Badge> : null}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {entry.assignee ? <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {entry.assignee}</span> : null}
                            {entry.animal_id ? (
                              animalName.has(entry.animal_id) ? (
                                <Link href={`/animales/${entry.animal_id}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                                  <PawPrint className="h-3 w-3" /> {animalName.get(entry.animal_id)}
                                </Link>
                              ) : (
                                <span className="inline-flex items-center gap-1"><PawPrint className="h-3 w-3" /> Animal vinculado</span>
                              )
                            ) : null}
                          </div>
                          {entry.notes ? <p className="mt-1.5 text-sm text-muted-foreground">{entry.notes}</p> : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {!closed ? (
                            <Button variant="ghost" size="icon" onClick={() => void complete(entry)} aria-label={`Marcar «${entry.title}» como completada`} className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700">
                              <CheckCircle2 />
                            </Button>
                          ) : null}
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`Acciones para ${entry.title}`}><MoreHorizontal /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => { setEditing(entry); setFormOpen(true); }}><PencilLine /> Editar</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => setDeleting(entry)} className="text-destructive focus:bg-rose-50 focus:text-destructive"><Trash2 /> Eliminar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Card>

      <AgendaFormDialog open={formOpen} onOpenChange={setFormOpen} entry={editing} animals={animals} onSaved={upsert} />
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="¿Eliminar esta cita?"
        description={`Se borrará «${deleting?.title ?? ''}» de la agenda. Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
