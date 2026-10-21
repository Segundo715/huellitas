'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlarmClock, CheckCircle2, ClipboardList, HeartPulse, Loader2, MoreHorizontal, PawPrint, PencilLine, Plus, RefreshCw, Stethoscope, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { PageHeader, StatCard } from '@/components/page-header';
import { EmptyState, ErrorBanner, FieldError } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { listAnimals, type Animal } from '@/lib/data/animals';
import {
  CARE_STATUSES,
  CARE_TASK_SUGGESTIONS,
  careFormSchema,
  careStore,
  careToForm,
  careUrgency,
  emptyCareForm,
  formatDue,
  type CareFormValues,
  type CarePayload,
  type CareReminder,
  type CareUrgency,
} from '@/lib/data/care';
import { fieldErrors } from '@/lib/data/table-store';
import { celebrateFrom } from '@/lib/celebrate';
import { createClient } from '@/lib/supabase/client';
import { useCreateParam } from '@/lib/use-create-param';
import { cn } from '@/lib/utils';

type Errors = Partial<Record<keyof CareFormValues, string>>;

const SECTIONS: { key: CareUrgency; title: string; description: string; tone: string }[] = [
  { key: 'Vencido', title: 'Vencidos', description: 'Ya pasó la hora: atiéndelos primero.', tone: 'text-rose-600' },
  { key: 'Hoy', title: 'Hoy', description: 'Lo que toca durante el día.', tone: 'text-primary' },
  { key: 'Próximo', title: 'Próximos', description: 'Programados para los siguientes días.', tone: 'text-foreground' },
  { key: 'Completado', title: 'Completados recientemente', description: 'Últimos cuidados cerrados.', tone: 'text-muted-foreground' },
];

function CareFormDialog({ open, onOpenChange, reminder, animals, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; reminder: CareReminder | null; animals: Animal[]; onSaved: (reminder: CareReminder) => void }) {
  const [form, setForm] = useState<CareFormValues>(emptyCareForm);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(reminder ? careToForm(reminder) : emptyCareForm());
      setErrors({});
    }
  }, [open, reminder]);

  const set = (field: keyof CareFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const chooseAnimal = (id: string) => {
    const animal = animals.find((a) => a.id === id);
    setForm((current) => ({ ...current, animal_id: id, animal_name: animal?.name ?? current.animal_name }));
    setErrors((current) => ({ ...current, animal_name: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = careFormSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors<keyof CareFormValues>(parsed.error.issues));
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const saved = reminder ? await careStore.update(supabase, reminder.id, parsed.data) : await careStore.create(supabase, parsed.data);
      toast.success(reminder ? 'Recordatorio actualizado' : `Recordatorio para ${saved.animal_name}: ${formatDue(saved.due_at).toLowerCase()}`);
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
          <DialogTitle>{reminder ? 'Editar recordatorio' : 'Nuevo recordatorio de cuidado'}</DialogTitle>
          <DialogDescription>Vacunas, medicación, controles… todo el equipo lo verá en Seguimiento.</DialogDescription>
        </DialogHeader>
        <form id="care-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          {animals.length ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="care-animal">Animal *</Label>
              <NativeSelect id="care-animal" value={form.animal_id} onChange={(e) => chooseAnimal(e.target.value)} aria-invalid={Boolean(errors.animal_name)}>
                <option value="">Elige un animal…</option>
                {animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.name} · {animal.type}{animal.breed ? ` (${animal.breed})` : ''}</option>)}
              </NativeSelect>
              <FieldError message={errors.animal_name} />
            </div>
          ) : (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="care-animal-name">Animal *</Label>
              <Input id="care-animal-name" value={form.animal_name} onChange={(e) => set('animal_name', e.target.value)} placeholder="Nombre del animal" aria-invalid={Boolean(errors.animal_name)} />
              <FieldError message={errors.animal_name} />
            </div>
          )}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="care-task">Cuidado *</Label>
            <Input id="care-task" list="care-tasks" value={form.task} onChange={(e) => set('task', e.target.value)} placeholder="Ej. Refuerzo de vacuna" aria-invalid={Boolean(errors.task)} />
            <datalist id="care-tasks">{CARE_TASK_SUGGESTIONS.map((task) => <option key={task} value={task} />)}</datalist>
            <FieldError message={errors.task} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="care-due">Fecha y hora *</Label>
            <Input id="care-due" type="datetime-local" value={form.due_at} onChange={(e) => set('due_at', e.target.value)} aria-invalid={Boolean(errors.due_at)} />
            <FieldError message={errors.due_at} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="care-status">Estado</Label>
            <NativeSelect id="care-status" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {CARE_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </NativeSelect>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="care-notes">Indicaciones</Label>
            <Textarea id="care-notes" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Dosis, con comida, quién la indicó…" />
            <FieldError message={errors.notes} />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="care-form" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            {reminder ? 'Guardar cambios' : 'Crear recordatorio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const urgencyBadge: Record<CareUrgency, 'danger' | 'info' | 'neutral' | 'success'> = { Vencido: 'danger', Hoy: 'info', Próximo: 'neutral', Completado: 'success' };

export function CareManager() {
  const [reminders, setReminders] = useState<CareReminder[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CareReminder | null>(null);
  const [deleting, setDeleting] = useState<CareReminder | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      setReminders(await careStore.list(supabase));
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudo cargar el seguimiento.');
    } finally {
      setLoading(false);
    }
    listAnimals(supabase).then(setAnimals, () => setAnimals([]));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const animalById = useMemo(() => new Map(animals.map((animal) => [animal.id, animal])), [animals]);

  const grouped = useMemo(() => {
    const now = new Date();
    const groups: Record<CareUrgency, CareReminder[]> = { Vencido: [], Hoy: [], Próximo: [], Completado: [] };
    for (const reminder of reminders) groups[careUrgency(reminder, now)].push(reminder);
    groups.Completado = groups.Completado.sort((a, b) => b.due_at.localeCompare(a.due_at)).slice(0, 8);
    return groups;
  }, [reminders]);

  const inTreatment = animals.filter((animal) => animal.status === 'En tratamiento');

  const upsert = (saved: CareReminder) =>
    setReminders((current) => (current.some((r) => r.id === saved.id) ? current.map((r) => (r.id === saved.id ? saved : r)) : [...current, saved]).sort((a, b) => a.due_at.localeCompare(b.due_at)));

  const setStatus = async (reminder: CareReminder, status: CarePayload['status']) => {
    setBusyId(reminder.id);
    try {
      upsert(await careStore.update(createClient(), reminder.id, { status }));
      if (status === 'Completada') toast.success(`${reminder.task} de ${reminder.animal_name}: hecho`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await careStore.remove(createClient(), deleting.id);
      setReminders((current) => current.filter((r) => r.id !== deleting.id));
      toast.success('Recordatorio eliminado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar.');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  useCreateParam(openCreate);

  const pending = reminders.filter((r) => r.status !== 'Completada').length;
  const doneTotal = reminders.length - pending;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seguimiento"
        title="Control de bienestar"
        description="Vacunas, medicación y revisiones de cada animal, para que nada se olvide."
        actions={
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading} aria-label="Recargar">
              <RefreshCw className={loading ? 'animate-spin' : undefined} />
            </Button>
            <Button onClick={openCreate}><Plus /> Nuevo recordatorio</Button>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Vencidos" value={loading ? '—' : grouped.Vencido.length} icon={AlarmClock} tone={grouped.Vencido.length ? 'rose' : 'emerald'} hint={grouped.Vencido.length ? 'Requieren atención' : 'Nada atrasado'} />
        <StatCard label="Para hoy" value={loading ? '—' : grouped.Hoy.length} icon={Stethoscope} tone="sky" />
        <StatCard label="Pendientes" value={loading ? '—' : pending} icon={ClipboardList} tone="violet" />
        <StatCard label="Cumplimiento" value={loading ? '—' : reminders.length ? `${Math.round((doneTotal / reminders.length) * 100)}%` : '—'} icon={CheckCircle2} tone="emerald" hint={`${doneTotal} de ${reminders.length} completados`} />
      </section>

      {loadError ? <ErrorBanner message={loadError} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {loading ? (
            <Card className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</Card>
          ) : reminders.length === 0 ? (
            <Card>
              <EmptyState icon={HeartPulse} title="Sin recordatorios" description="Crea el primero: una vacuna, una medicación o un control de peso." action={<Button onClick={openCreate}><Plus /> Nuevo recordatorio</Button>} />
            </Card>
          ) : (
            SECTIONS.filter((section) => grouped[section.key].length).map((section) => (
              <Card key={section.key}>
                <CardHeader className="pb-3">
                  <CardTitle className={cn('flex items-center gap-2 text-base', section.tone)}>
                    {section.title} <span className="text-sm font-normal text-muted-foreground">· {grouped[section.key].length}</span>
                  </CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="stagger-rows space-y-2">
                    {grouped[section.key].map((reminder) => {
                      const animal = reminder.animal_id ? animalById.get(reminder.animal_id) : undefined;
                      const urgency = section.key;
                      return (
                        <li key={reminder.id} className={cn('flex items-center gap-3 rounded-xl border p-3 transition hover:shadow-card', urgency === 'Vencido' && 'border-rose-200 bg-rose-50/40', urgency === 'Completado' && 'opacity-70')}>
                          {animal?.photo_webp ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={animal.photo_webp} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><PawPrint className="h-5 w-5" /></div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">
                              {animal ? <Link href={`/animales/${animal.id}`} className="hover:text-primary hover:underline">{reminder.animal_name}</Link> : reminder.animal_name}
                              <span className="font-normal text-muted-foreground"> · {reminder.task}</span>
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant={urgencyBadge[urgency]}>{formatDue(reminder.due_at)}</Badge>
                              {reminder.status !== 'Pendiente' && reminder.status !== 'Completada' ? <Badge variant="outline">{reminder.status}</Badge> : null}
                            </div>
                            {reminder.notes ? <p className="mt-1 text-sm text-muted-foreground">{reminder.notes}</p> : null}
                          </div>
                          {urgency !== 'Completado' ? (
                            <Button size="sm" variant="outline" onClick={(event) => { celebrateFrom(event.currentTarget, 10); void setStatus(reminder, 'Completada'); }} disabled={busyId === reminder.id} className="shrink-0 text-emerald-700 hover:bg-emerald-50">
                              {busyId === reminder.id ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} <span className="hidden sm:inline">Hecho</span>
                            </Button>
                          ) : null}
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`Acciones para ${reminder.task} de ${reminder.animal_name}`}><MoreHorizontal /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => { setEditing(reminder); setFormOpen(true); }}><PencilLine /> Editar</DropdownMenuItem>
                              {urgency === 'Completado' ? <DropdownMenuItem onSelect={() => void setStatus(reminder, 'Pendiente')}><AlarmClock /> Reabrir</DropdownMenuItem> : null}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => setDeleting(reminder)} className="text-destructive focus:bg-rose-50 focus:text-destructive"><Trash2 /> Eliminar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">En tratamiento</CardTitle>
            <CardDescription>{animals.length ? 'Animales que hoy necesitan más atención.' : 'Visible para administración y operadores.'}</CardDescription>
          </CardHeader>
          <CardContent>
            {inTreatment.length ? (
              <ul className="stagger-rows space-y-2">
                {inTreatment.map((animal) => {
                  const next = reminders.find((r) => r.animal_id === animal.id && r.status !== 'Completada');
                  return (
                    <li key={animal.id}>
                      <Link href={`/animales/${animal.id}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-muted">
                        {animal.photo_webp ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={animal.photo_webp} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><PawPrint className="h-4 w-4" /></div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{animal.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{next ? `${next.task} · ${formatDue(next.due_at)}` : 'Sin recordatorio programado'}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{animals.length ? 'Ningún animal en tratamiento ahora mismo.' : 'Sin datos de expedientes.'}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <CareFormDialog open={formOpen} onOpenChange={setFormOpen} reminder={editing} animals={animals} onSaved={upsert} />
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="¿Eliminar este recordatorio?"
        description={`Se borrará «${deleting?.task ?? ''}» de ${deleting?.animal_name ?? ''}.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
