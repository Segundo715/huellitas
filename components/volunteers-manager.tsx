'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock, Gauge, Handshake, Loader2, MoreHorizontal, PencilLine, Plus, RefreshCw, Trash2, UserX, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
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
import { formatDayLabel, fieldErrors, formatTime, localTodayIso } from '@/lib/data/table-store';
import {
  currentWeek,
  emptyShiftForm,
  emptyTeamForm,
  shiftFormSchema,
  shiftStatusVariant,
  shiftStore,
  teamFormSchema,
  teamStore,
  type ShiftFormValues,
  type ShiftPayload,
  type TeamFormValues,
  type VolunteerShift,
  type VolunteerTeam,
} from '@/lib/data/volunteers';
import { createClient } from '@/lib/supabase/client';
import { useCreateParam } from '@/lib/use-create-param';
import { cn } from '@/lib/utils';

const TEAM_COLORS = ['from-sky-400 to-indigo-500', 'from-emerald-400 to-teal-500', 'from-amber-400 to-orange-500', 'from-fuchsia-400 to-violet-500', 'from-rose-400 to-pink-500'];

function TeamFormDialog({ open, onOpenChange, team, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; team: VolunteerTeam | null; onSaved: (team: VolunteerTeam) => void }) {
  const [form, setForm] = useState<TeamFormValues>(emptyTeamForm);
  const [errors, setErrors] = useState<Partial<Record<keyof TeamFormValues, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(team ? { name: team.name, description: team.description ?? '', weekly_shifts_needed: String(team.weekly_shifts_needed) } : emptyTeamForm);
      setErrors({});
    }
  }, [open, team]);

  const set = (field: keyof TeamFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = teamFormSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors<keyof TeamFormValues>(parsed.error.issues));
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const saved = team ? await teamStore.update(supabase, team.id, parsed.data) : await teamStore.create(supabase, parsed.data);
      toast.success(team ? 'Equipo actualizado' : `Equipo «${saved.name}» creado`);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{team ? 'Editar equipo' : 'Nuevo equipo'}</DialogTitle>
          <DialogDescription>La cobertura se calcula con los turnos de la semana frente a los que el equipo necesita.</DialogDescription>
        </DialogHeader>
        <form id="team-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="team-name">Nombre *</Label>
            <Input id="team-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej. Limpieza de gateras" aria-invalid={Boolean(errors.name)} />
            <FieldError message={errors.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-description">Qué hace</Label>
            <Textarea id="team-description" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
            <FieldError message={errors.description} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-needed">Turnos necesarios por semana</Label>
            <Input id="team-needed" type="number" min="0" max="100" inputMode="numeric" value={form.weekly_shifts_needed} onChange={(e) => set('weekly_shifts_needed', e.target.value)} aria-invalid={Boolean(errors.weekly_shifts_needed)} />
            <FieldError message={errors.weekly_shifts_needed} />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="team-form" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : null}{team ? 'Guardar' : 'Crear equipo'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShiftFormDialog({ open, onOpenChange, shift, teams, defaultTeam, defaultName, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; shift: VolunteerShift | null; teams: VolunteerTeam[]; defaultTeam: string; defaultName: string; onSaved: (shift: VolunteerShift) => void }) {
  const [form, setForm] = useState<ShiftFormValues>(() => emptyShiftForm());
  const [errors, setErrors] = useState<Partial<Record<keyof ShiftFormValues, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        shift
          ? { team_id: shift.team_id, volunteer_name: shift.volunteer_name, date: shift.date, start_time: formatTime(shift.start_time), end_time: formatTime(shift.end_time), notes: shift.notes ?? '' }
          : emptyShiftForm(defaultTeam || teams[0]?.id || '', defaultName),
      );
      setErrors({});
    }
  }, [open, shift, teams, defaultTeam, defaultName]);

  const set = (field: keyof ShiftFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = shiftFormSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors<keyof ShiftFormValues>(parsed.error.issues));
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const saved = shift ? await shiftStore.update(supabase, shift.id, parsed.data) : await shiftStore.create(supabase, { ...parsed.data, status: 'Programado' });
      toast.success(shift ? 'Turno actualizado' : `Turno de ${saved.volunteer_name} para ${formatDayLabel(saved.date).toLowerCase()}`);
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{shift ? 'Editar turno' : 'Apuntarse a un turno'}</DialogTitle>
          <DialogDescription>Elige equipo, día y horario. El resto del equipo lo verá al instante.</DialogDescription>
        </DialogHeader>
        <form id="shift-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="shift-team">Equipo *</Label>
            <NativeSelect id="shift-team" value={form.team_id} onChange={(e) => set('team_id', e.target.value)} aria-invalid={Boolean(errors.team_id)}>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </NativeSelect>
            <FieldError message={errors.team_id} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="shift-name">Voluntario *</Label>
            <Input id="shift-name" value={form.volunteer_name} onChange={(e) => set('volunteer_name', e.target.value)} aria-invalid={Boolean(errors.volunteer_name)} />
            <FieldError message={errors.volunteer_name} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="shift-date">Día *</Label>
            <Input id="shift-date" type="date" min={shift ? undefined : localTodayIso()} value={form.date} onChange={(e) => set('date', e.target.value)} aria-invalid={Boolean(errors.date)} />
            <FieldError message={errors.date} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shift-start">Entrada *</Label>
            <Input id="shift-start" type="time" value={form.start_time} onChange={(e) => set('start_time', e.target.value)} aria-invalid={Boolean(errors.start_time)} />
            <FieldError message={errors.start_time} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shift-end">Salida</Label>
            <Input id="shift-end" type="time" value={form.end_time} onChange={(e) => set('end_time', e.target.value)} aria-invalid={Boolean(errors.end_time)} />
            <FieldError message={errors.end_time} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="shift-notes">Notas</Label>
            <Input id="shift-notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Opcional" />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="shift-form" disabled={saving || teams.length === 0}>{saving ? <Loader2 className="animate-spin" /> : null}{shift ? 'Guardar' : 'Confirmar turno'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function VolunteersManager() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [teams, setTeams] = useState<VolunteerTeam[]>([]);
  const [shifts, setShifts] = useState<VolunteerShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [teamForm, setTeamForm] = useState<{ open: boolean; team: VolunteerTeam | null }>({ open: false, team: null });
  const [shiftForm, setShiftForm] = useState<{ open: boolean; shift: VolunteerShift | null; team: string }>({ open: false, shift: null, team: '' });
  const [deleting, setDeleting] = useState<{ kind: 'team'; item: VolunteerTeam } | { kind: 'shift'; item: VolunteerShift } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const [teamList, shiftList] = await Promise.all([teamStore.list(supabase), shiftStore.list(supabase)]);
      setTeams(teamList);
      setShifts(shiftList);
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudo cargar el voluntariado.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const today = localTodayIso();
  const week = currentWeek();
  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);

  const teamStats = useMemo(
    () =>
      teams.map((team, index) => {
        const mine = shifts.filter((s) => s.team_id === team.id);
        const thisWeek = mine.filter((s) => s.date >= week.start && s.date <= week.end && s.status !== 'Cancelado' && s.status !== 'Ausente').length;
        const next = mine.find((s) => s.date >= today && s.status === 'Programado');
        const people = new Set(mine.map((s) => s.volunteer_name.trim().toLowerCase())).size;
        const coverage = team.weekly_shifts_needed ? Math.min(100, Math.round((thisWeek / team.weekly_shifts_needed) * 100)) : 100;
        return { team, thisWeek, next, people, coverage, color: TEAM_COLORS[index % TEAM_COLORS.length] };
      }),
    [teams, shifts, week.start, week.end, today],
  );

  const upcoming = useMemo(() => shifts.filter((s) => s.date >= today && s.status !== 'Cancelado'), [shifts, today]);
  const recentToConfirm = useMemo(() => shifts.filter((s) => s.date < today && s.status === 'Programado'), [shifts, today]);
  const grouped = useMemo(() => {
    const map = new Map<string, VolunteerShift[]>();
    for (const shift of upcoming.slice(0, 30)) map.set(shift.date, [...(map.get(shift.date) ?? []), shift]);
    return [...map.entries()];
  }, [upcoming]);

  const avgCoverage = teamStats.length ? Math.round(teamStats.reduce((sum, t) => sum + t.coverage, 0) / teamStats.length) : 0;
  const volunteers = new Set(shifts.filter((s) => s.date >= week.start).map((s) => s.volunteer_name.trim().toLowerCase())).size;
  const lowTeams = teamStats.filter((t) => t.coverage < 60);

  const upsertShift = (saved: VolunteerShift) =>
    setShifts((current) => (current.some((s) => s.id === saved.id) ? current.map((s) => (s.id === saved.id ? saved : s)) : [...current, saved]).sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`)));
  const upsertTeam = (saved: VolunteerTeam) => setTeams((current) => (current.some((t) => t.id === saved.id) ? current.map((t) => (t.id === saved.id ? saved : t)) : [...current, saved]));

  const setShiftStatus = async (shift: VolunteerShift, status: NonNullable<ShiftPayload['status']>) => {
    try {
      upsertShift(await shiftStore.update(createClient(), shift.id, { status }));
      toast.success(`Turno de ${shift.volunteer_name}: ${status.toLowerCase()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar.');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const supabase = createClient();
      if (deleting.kind === 'team') {
        await teamStore.remove(supabase, deleting.item.id);
        setTeams((current) => current.filter((t) => t.id !== deleting.item.id));
        setShifts((current) => current.filter((s) => s.team_id !== deleting.item.id));
        toast.success('Equipo eliminado');
      } else {
        await shiftStore.remove(supabase, deleting.item.id);
        setShifts((current) => current.filter((s) => s.id !== deleting.item.id));
        toast.success('Turno eliminado');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar.');
    }
  };

  const openShift = (team = '') => setShiftForm({ open: true, shift: null, team });
  useCreateParam(() => openShift());

  const shiftRow = (shift: VolunteerShift, past = false) => (
    <li key={shift.id} className="flex items-center gap-3 rounded-xl border p-3">
      <div className="w-16 shrink-0 text-center text-xs font-semibold tabular-nums text-muted-foreground">
        {formatTime(shift.start_time)}
        {shift.end_time ? <span className="block font-normal">{formatTime(shift.end_time)}</span> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{shift.volunteer_name}</p>
        <p className="truncate text-xs text-muted-foreground">{teamById.get(shift.team_id)?.name ?? 'Equipo eliminado'}{past ? ` · ${formatDayLabel(shift.date)}` : ''}{shift.notes ? ` · ${shift.notes}` : ''}</p>
      </div>
      {shift.status !== 'Programado' ? <Badge variant={shiftStatusVariant(shift.status)}>{shift.status}</Badge> : null}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Acciones para el turno de ${shift.volunteer_name}`}><MoreHorizontal /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void setShiftStatus(shift, 'Cumplido')}><CheckCircle2 /> Marcar cumplido</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void setShiftStatus(shift, 'Ausente')}><UserX /> Marcar ausencia</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShiftForm({ open: true, shift, team: shift.team_id })}><PencilLine /> Editar</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDeleting({ kind: 'shift', item: shift })} className="text-destructive focus:bg-rose-50 focus:text-destructive"><Trash2 /> Eliminar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Voluntariado"
        title="Equipos y turnos"
        description="Quién viene, cuándo y qué equipos necesitan más manos esta semana."
        actions={
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading} aria-label="Recargar">
              <RefreshCw className={loading ? 'animate-spin' : undefined} />
            </Button>
            {isAdmin ? <Button variant="outline" onClick={() => setTeamForm({ open: true, team: null })}><Users /> Nuevo equipo</Button> : null}
            <Button onClick={() => openShift()} disabled={!teams.length}><Plus /> Apuntarse a un turno</Button>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Turnos hoy" value={loading ? '—' : upcoming.filter((s) => s.date === today).length} icon={Clock} tone="sky" />
        <StatCard label="Cobertura semanal" value={loading ? '—' : `${avgCoverage}%`} icon={Gauge} tone={avgCoverage >= 80 ? 'emerald' : avgCoverage >= 50 ? 'amber' : 'rose'} hint="Promedio de los equipos" />
        <StatCard label="Voluntarios esta semana" value={loading ? '—' : volunteers} icon={Users} tone="violet" />
        <StatCard label="Por confirmar" value={loading ? '—' : recentToConfirm.length} icon={CalendarClock} tone={recentToConfirm.length ? 'amber' : 'emerald'} hint="Turnos pasados sin marcar" />
      </section>

      {loadError ? <ErrorBanner message={loadError} /> : null}

      {!loading && lowTeams.length ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Handshake className="h-4 w-4 shrink-0" />
          <span>Necesitan apoyo esta semana:</span>
          {lowTeams.map(({ team, coverage }) => (
            <button key={team.id} type="button" onClick={() => openShift(team.id)} className="rounded-full bg-white/70 px-2.5 py-0.5 font-semibold transition hover:bg-white dark:bg-white/10">
              {team.name} ({coverage}%)
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-52 w-full rounded-2xl" />)}</div>
      ) : teams.length === 0 ? (
        <Card><EmptyState icon={Handshake} title="Aún no hay equipos" description={isAdmin ? 'Crea el primer equipo de voluntarios.' : 'La administración todavía no ha creado equipos.'} action={isAdmin ? <Button onClick={() => setTeamForm({ open: true, team: null })}><Users /> Nuevo equipo</Button> : undefined} /></Card>
      ) : (
        <section className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teamStats.map(({ team, thisWeek, next, people, coverage, color }) => (
            <article key={team.id} className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
              <div className={cn('h-1.5 bg-gradient-to-r', color)} />
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-bold">{team.name}</h3>
                    {team.description ? <p className="mt-1 text-sm text-muted-foreground">{team.description}</p> : null}
                  </div>
                  {isAdmin ? (
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="-mr-2 -mt-1 shrink-0" aria-label={`Acciones para ${team.name}`}><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setTeamForm({ open: true, team })}><PencilLine /> Editar equipo</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setDeleting({ kind: 'team', item: team })} className="text-destructive focus:bg-rose-50 focus:text-destructive"><Trash2 /> Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
                <div className="mt-5">
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">Cobertura de la semana</span>
                    <span className="font-semibold tabular-nums">{thisWeek}/{team.weekly_shifts_needed} · {coverage}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={cn('grow-x h-full rounded-full', coverage >= 80 ? 'bg-emerald-500' : coverage >= 50 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${coverage}%` }} />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">Próximo turno</p>
                    <p className="mt-0.5 font-semibold">{next ? `${formatDayLabel(next.date)}, ${formatTime(next.start_time)}` : 'Sin programar'}</p>
                  </div>
                  <div className="rounded-xl bg-muted/60 p-3">
                    <p className="text-xs text-muted-foreground">Personas</p>
                    <p className="mt-0.5 font-semibold">{people}</p>
                  </div>
                </div>
                <Button variant="outline" className="mt-4" onClick={() => openShift(team.id)}><Plus /> Cubrir un turno</Button>
              </div>
            </article>
          ))}
        </section>
      )}

      {!loading && teams.length ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <Card>
            <CardHeader>
              <CardTitle>Próximos turnos</CardTitle>
              <CardDescription>Los siguientes 30 turnos programados.</CardDescription>
            </CardHeader>
            <CardContent>
              {grouped.length ? (
                <div className="space-y-5">
                  {grouped.map(([date, list]) => (
                    <section key={date}>
                      <h3 className={cn('mb-2 text-sm font-semibold', date === today && 'text-primary')}>{formatDayLabel(date)}</h3>
                      <ul className="stagger-rows space-y-2">{list.map((shift) => shiftRow(shift))}</ul>
                    </section>
                  ))}
                </div>
              ) : (
                <EmptyState icon={CalendarClock} title="Sin turnos programados" description="Apúntate al primero para esta semana." className="py-8" />
              )}
            </CardContent>
          </Card>
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Por confirmar</CardTitle>
              <CardDescription>Turnos ya pasados: ¿se cumplieron?</CardDescription>
            </CardHeader>
            <CardContent>
              {recentToConfirm.length ? <ul className="stagger-rows space-y-2">{recentToConfirm.slice(-8).reverse().map((shift) => shiftRow(shift, true))}</ul> : <p className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Todo confirmado.</p>}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <TeamFormDialog open={teamForm.open} onOpenChange={(open) => setTeamForm((current) => ({ ...current, open }))} team={teamForm.team} onSaved={upsertTeam} />
      <ShiftFormDialog open={shiftForm.open} onOpenChange={(open) => setShiftForm((current) => ({ ...current, open }))} shift={shiftForm.shift} teams={teams} defaultTeam={shiftForm.team} defaultName={user?.name ?? ''} onSaved={upsertShift} />
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting?.kind === 'team' ? `¿Eliminar el equipo ${deleting.item.name}?` : '¿Eliminar este turno?'}
        description={deleting?.kind === 'team' ? 'También se borrarán todos sus turnos. Esta acción no se puede deshacer.' : 'El turno desaparecerá de la agenda del equipo.'}
        onConfirm={handleDelete}
      />
    </div>
  );
}
