'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, Flame, Inbox, LocateFixed, Loader2, MapPin, Megaphone, Phone, Plus, RefreshCw, Search, ShieldAlert, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { FilterChip, PageHeader, StatCard } from '@/components/page-header';
import { EmptyState, ErrorBanner, FieldError } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { STAFF_ROLES } from '@/lib/auth/roles';
import {
  REPORT_PRIORITIES,
  REPORT_STATUSES,
  REPORT_TYPES,
  emptyReportForm,
  isOpenReport,
  mapLinks,
  reportFormSchema,
  reportPriorityVariant,
  reportStatusVariant,
  reportStore,
  timeAgo,
  type CitizenReport,
  type ReportFormValues,
} from '@/lib/data/reports';
import { fieldErrors } from '@/lib/data/table-store';
import { createClient } from '@/lib/supabase/client';
import { useCreateParam } from '@/lib/use-create-param';
import { cn } from '@/lib/utils';

type Errors = Partial<Record<keyof ReportFormValues, string>>;
const VIEWS = ['Abiertos', 'Atendidos', 'Todos'] as const;

function ReportFormDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: (report: CitizenReport) => void }) {
  const [form, setForm] = useState<ReportFormValues>(emptyReportForm);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(emptyReportForm());
      setErrors({});
    }
  }, [open]);

  const set = (field: keyof ReportFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Este navegador no puede obtener la ubicación.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({ ...current, latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) }));
        setErrors((current) => ({ ...current, address: undefined }));
        setLocating(false);
        toast.success('Ubicación añadida al reporte');
      },
      () => {
        setLocating(false);
        toast.error('No se pudo obtener la ubicación. Escribe la dirección.');
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = reportFormSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors<keyof ReportFormValues>(parsed.error.issues));
      return;
    }
    setSaving(true);
    try {
      const saved = await reportStore.create(createClient(), { ...parsed.data, status: 'Pendiente' });
      toast.success(`Reporte de ${saved.type.toLowerCase()} registrado`);
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const hasCoords = form.latitude !== '' && form.longitude !== '';

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo reporte ciudadano</DialogTitle>
          <DialogDescription>Registra un aviso recibido por teléfono, redes o en persona.</DialogDescription>
        </DialogHeader>
        <form id="report-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="space-y-2">
            <Label htmlFor="rep-type">Tipo</Label>
            <NativeSelect id="rep-type" value={form.type} onChange={(e) => set('type', e.target.value)}>
              {REPORT_TYPES.map((type) => <option key={type}>{type}</option>)}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rep-priority">Prioridad</Label>
            <NativeSelect id="rep-priority" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {REPORT_PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
            </NativeSelect>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="rep-description">¿Qué está pasando? *</Label>
            <Textarea id="rep-description" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Estado del animal, desde cuándo, si hay riesgo inmediato…" aria-invalid={Boolean(errors.description)} />
            <FieldError message={errors.description} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="rep-address">Dirección o referencia</Label>
            <div className="flex gap-2">
              <Input id="rep-address" value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Calle, número, colonia o punto de referencia" aria-invalid={Boolean(errors.address)} />
              <Button type="button" variant="outline" onClick={useMyLocation} disabled={locating} className="shrink-0">
                {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />} <span className="hidden sm:inline">Mi ubicación</span>
              </Button>
            </div>
            {hasCoords ? <p className="text-xs text-emerald-700">📍 Coordenadas: {form.latitude}, {form.longitude}</p> : null}
            <FieldError message={errors.address} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rep-name">Quién reporta</Label>
            <Input id="rep-name" value={form.reporter_name} onChange={(e) => set('reporter_name', e.target.value)} placeholder="Opcional" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rep-contact">Contacto</Label>
            <Input id="rep-contact" value={form.reporter_contact} onChange={(e) => set('reporter_contact', e.target.value)} placeholder="Teléfono o correo (opcional)" />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="report-form" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null} Registrar reporte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReportDetail({ report, canManage, onSaved, onDelete }: { report: CitizenReport; canManage: boolean; onSaved: (report: CitizenReport) => void; onDelete: () => void }) {
  const [status, setStatus] = useState(report.status);
  const [assignee, setAssignee] = useState(report.assignee ?? '');
  const [notes, setNotes] = useState(report.resolution_notes ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(report.status);
    setAssignee(report.assignee ?? '');
    setNotes(report.resolution_notes ?? '');
  }, [report]);

  const dirty = status !== report.status || assignee !== (report.assignee ?? '') || notes !== (report.resolution_notes ?? '');
  const map = mapLinks(report);

  const save = async () => {
    setSaving(true);
    try {
      const saved = await reportStore.update(createClient(), report.id, { status, assignee: assignee.trim() || null, resolution_notes: notes.trim() || null });
      toast.success(status === 'Atendido' && report.status !== 'Atendido' ? '¡Caso atendido! 🐾' : 'Reporte actualizado');
      onSaved(saved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      {map?.embed ? (
        <iframe title={`Mapa del reporte de ${report.type}`} src={map.embed} className="h-56 w-full border-0 bg-muted" loading="lazy" />
      ) : (
        <div className="bg-dots flex h-28 items-center justify-center bg-muted/40 text-sm text-muted-foreground">
          <MapPin className="mr-2 h-4 w-4" /> {report.address ? 'Sin coordenadas: abre la dirección en el mapa' : 'Sin ubicación registrada'}
        </div>
      )}
      <CardContent className="space-y-5 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={reportPriorityVariant(report.priority)}>Prioridad {report.priority.toLowerCase()}</Badge>
            <Badge variant={reportStatusVariant(report.status)}>{report.status}</Badge>
            <span className="text-xs text-muted-foreground">{timeAgo(report.created_at)}</span>
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold">{report.type}</h2>
          {report.description ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{report.description}</p> : null}
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-muted/60 p-3">
            <dt className="text-xs text-muted-foreground">Ubicación</dt>
            <dd className="mt-1 font-medium">{report.address ?? (report.latitude != null ? `${report.latitude}, ${report.longitude}` : 'No indicada')}</dd>
            {map ? (
              <a href={map.open} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                Abrir en Google Maps <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <dt className="text-xs text-muted-foreground">Reportó</dt>
            <dd className="mt-1 flex items-center gap-1.5 font-medium"><User className="h-3.5 w-3.5" /> {report.reporter_name ?? 'Anónimo'}</dd>
            {report.reporter_contact ? <dd className="mt-1 flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {report.reporter_contact}</dd> : null}
          </div>
        </dl>

        {canManage ? (
          <div className="space-y-3 rounded-2xl border p-4">
            <p className="text-sm font-semibold">Seguimiento del caso</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rep-status">Estado</Label>
                <NativeSelect id="rep-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {REPORT_STATUSES.map((option) => <option key={option}>{option}</option>)}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rep-assignee">Responsable</Label>
                <Input id="rep-assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Quién lo atiende" maxLength={80} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rep-notes">Notas de resolución</Label>
              <Textarea id="rep-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Qué se hizo, a dónde se llevó al animal…" maxLength={2000} />
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <Button variant="ghost" onClick={onDelete} className="text-destructive hover:bg-rose-50 hover:text-destructive"><Trash2 /> Eliminar</Button>
              <div className="flex gap-2">
                {report.status !== 'Atendido' ? (
                  <Button variant="outline" onClick={() => setStatus('Atendido')} disabled={status === 'Atendido'}><CheckCircle2 /> Marcar atendido</Button>
                ) : null}
                <Button onClick={() => void save()} disabled={!dirty || saving}>{saving ? <Loader2 className="animate-spin" /> : null} Guardar</Button>
              </div>
            </div>
          </div>
        ) : report.assignee || report.resolution_notes ? (
          <div className="rounded-2xl border p-4 text-sm">
            {report.assignee ? <p><span className="font-semibold">Responsable:</span> {report.assignee}</p> : null}
            {report.resolution_notes ? <p className="mt-1 text-muted-foreground">{report.resolution_notes}</p> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ReportsManager() {
  const { user } = useAuth();
  const canManage = Boolean(user && STAFF_ROLES.includes(user.role));
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState<(typeof VIEWS)[number]>('Abiertos');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<CitizenReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReports(await reportStore.list(createClient()));
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los reportes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const priorityRank = { Alta: 0, Media: 1, Baja: 2 } as Record<string, number>;
    return reports
      .filter((report) => (view === 'Abiertos' ? isOpenReport(report) : view === 'Atendidos' ? !isOpenReport(report) : true))
      .filter((report) => !query || [report.type, report.description, report.address, report.reporter_name, report.assignee].some((v) => v?.toLowerCase().includes(query)))
      .sort((a, b) => (view === 'Abiertos' ? (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3) : 0) || b.created_at.localeCompare(a.created_at));
  }, [reports, view, search]);

  const selected = filtered.find((report) => report.id === selectedId) ?? filtered[0] ?? null;

  const stats = useMemo(
    () => ({
      pending: reports.filter((r) => r.status === 'Pendiente').length,
      urgent: reports.filter((r) => isOpenReport(r) && r.priority === 'Alta').length,
      inProgress: reports.filter((r) => r.status === 'Aprobado').length,
      solved: reports.filter((r) => r.status === 'Atendido').length,
    }),
    [reports],
  );

  const upsert = (saved: CitizenReport) => setReports((current) => (current.some((r) => r.id === saved.id) ? current.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...current]));

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await reportStore.remove(createClient(), deleting.id);
      setReports((current) => current.filter((r) => r.id !== deleting.id));
      toast.success('Reporte eliminado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar.');
    }
  };

  useCreateParam(() => setFormOpen(true));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reportes ciudadanos"
        title="Atención de casos"
        description="Avisos de maltrato, abandono o animales heridos que llegan al refugio."
        actions={
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading} aria-label="Recargar">
              <RefreshCw className={loading ? 'animate-spin' : undefined} />
            </Button>
            <Button onClick={() => setFormOpen(true)}><Plus /> Nuevo reporte</Button>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Pendientes" value={loading ? '—' : stats.pending} icon={Inbox} tone="amber" hint="Sin revisar" />
        <StatCard label="Urgentes abiertos" value={loading ? '—' : stats.urgent} icon={Flame} tone={stats.urgent ? 'rose' : 'emerald'} hint="Prioridad alta" />
        <StatCard label="En atención" value={loading ? '—' : stats.inProgress} icon={ShieldAlert} tone="sky" />
        <StatCard label="Atendidos" value={loading ? '—' : stats.solved} icon={CheckCircle2} tone="emerald" />
      </section>

      {loadError ? <ErrorBanner message={loadError} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="h-fit">
          <div className="space-y-3 border-b p-4">
            <div className="flex gap-2">
              {VIEWS.map((option) => <FilterChip key={option} active={view === option} onClick={() => setView(option)}>{option}</FilterChip>)}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por dirección, descripción…" className="pl-9" aria-label="Buscar reportes" />
            </div>
          </div>
          {loading ? (
            <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Megaphone} title={reports.length ? 'Nada en esta vista' : 'Sin reportes'} description={reports.length ? 'Cambia el filtro o la búsqueda.' : 'Cuando llegue un aviso, regístralo aquí.'} />
          ) : (
            <ul className="max-h-[38rem] divide-y overflow-y-auto">
              {filtered.map((report) => (
                <li key={report.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(report.id)}
                    aria-current={selected?.id === report.id}
                    className={cn('flex w-full gap-3 p-4 text-left transition hover:bg-muted/50', selected?.id === report.id && 'bg-accent/60')}
                  >
                    <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', report.priority === 'Alta' ? 'bg-rose-500' : report.priority === 'Media' ? 'bg-amber-500' : 'bg-slate-400', isOpenReport(report) && report.priority === 'Alta' && 'animate-pulse')} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{report.type}</span>
                        <Badge variant={reportStatusVariant(report.status)}>{report.status}</Badge>
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground">{report.description}</span>
                      <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> <span className="truncate">{report.address ?? 'Coordenadas GPS'}</span> · {timeAgo(report.created_at)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {selected ? (
          <ReportDetail report={selected} canManage={canManage} onSaved={upsert} onDelete={() => setDeleting(selected)} />
        ) : !loading ? (
          <Card><EmptyState icon={Megaphone} title="Selecciona un reporte" description="Aquí verás el detalle, el mapa y el seguimiento." /></Card>
        ) : null}
      </div>

      <ReportFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={(saved) => { upsert(saved); setView('Abiertos'); setSelectedId(saved.id); }} />
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="¿Eliminar este reporte?"
        description="Se borrará el caso y su seguimiento. Esta acción no se puede deshacer."
        onConfirm={handleDelete}
      />
    </div>
  );
}
