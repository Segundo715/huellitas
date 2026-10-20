'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Columns3,
  Eye,
  Heart,
  Inbox,
  List,
  Mail,
  MoreHorizontal,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdoptionFormDialog } from '@/components/adoptions/adoption-form-dialog';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { FilterChip, PageHeader, StatCard } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ACTIVE_STAGES,
  ADOPTION_PRIORITIES,
  ADOPTION_STAGES,
  STALE_AFTER_DAYS,
  adoptionPriorityVariant,
  adoptionStageVariant,
  daysSinceUpdate,
  deleteAdoption,
  isClosedStage,
  listAdoptions,
  nextStage,
  updateAdoption,
  type AdoptionRequest,
  type AdoptionStage,
} from '@/lib/data/adoptions';
import { listAnimals, setAnimalStatus, type Animal } from '@/lib/data/animals';
import { createClient } from '@/lib/supabase/client';
import { useCreateParam } from '@/lib/use-create-param';
import { cn } from '@/lib/utils';

type View = 'lista' | 'tablero';

const BOARD_STAGES: AdoptionStage[] = [...ACTIVE_STAGES, 'Aprobada'];

function isStale(request: AdoptionRequest) {
  return !isClosedStage(request.stage) && daysSinceUpdate(request) >= STALE_AFTER_DAYS;
}

function formatSince(request: AdoptionRequest) {
  const days = daysSinceUpdate(request);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return `Hace ${days} días`;
}

function ViewToggle({ view }: { view: View }) {
  const options = [
    { value: 'lista' as const, href: '/adopciones', label: 'Lista', icon: List },
    { value: 'tablero' as const, href: '/adopciones/solicitudes', label: 'Tablero', icon: Columns3 },
  ];
  return (
    <div className="inline-flex rounded-lg border bg-background p-0.5" role="group" aria-label="Vista">
      {options.map(({ value, href, label, icon: Icon }) => (
        <Link
          key={value}
          href={href}
          aria-current={view === value ? 'page' : undefined}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition',
            view === value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="h-4 w-4" /> {label}
        </Link>
      ))}
    </div>
  );
}

export function AdoptionManager({ view }: { view: View }) {
  const [requests, setRequests] = useState<AdoptionRequest[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('Activas');
  const [priorityFilter, setPriorityFilter] = useState<string>('Todas');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdoptionRequest | null>(null);
  const [deleting, setDeleting] = useState<AdoptionRequest | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const [nextRequests, nextAnimals] = await Promise.all([listAdoptions(supabase), listAnimals(supabase)]);
      setRequests(nextRequests);
      setAnimals(nextAnimals);
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar las solicitudes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () => ({
      active: requests.filter((r) => !isClosedStage(r.stage)).length,
      fresh: requests.filter((r) => r.stage === 'Nueva').length,
      approved: requests.filter((r) => r.stage === 'Aprobada').length,
      stale: requests.filter(isStale).length,
    }),
    [requests],
  );

  // En el tablero el filtro de etapa no aplica: las columnas ya separan por etapa.
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      if (view === 'lista') {
        if (stageFilter === 'Activas' && isClosedStage(request.stage)) return false;
        if (stageFilter === 'Estancadas' && !isStale(request)) return false;
        if (!['Activas', 'Estancadas', 'Todas'].includes(stageFilter) && request.stage !== stageFilter) return false;
      }
      if (priorityFilter !== 'Todas' && request.priority !== priorityFilter) return false;
      if (!query) return true;
      return [request.applicant_name, request.email, request.animal_name, request.city, request.assignee].some((value) => value?.toLowerCase().includes(query));
    });
  }, [requests, search, stageFilter, priorityFilter, view]);

  const animalsById = useMemo(() => new Map(animals.map((animal) => [animal.id, animal])), [animals]);

  const replace = (saved: AdoptionRequest) => {
    setRequests((current) => (current.some((r) => r.id === saved.id) ? current.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...current]));
  };

  const offerMarkAdopted = (request: AdoptionRequest) => {
    const animal = request.animal_id ? animalsById.get(request.animal_id) : undefined;
    if (!animal || animal.status === 'Adoptado') return;

    toast(`¿Marcar a ${animal.name} como adoptado?`, {
      description: 'Actualiza su expediente para que deje de aparecer como disponible.',
      duration: 10_000,
      action: {
        label: 'Marcar',
        onClick: async () => {
          try {
            await setAnimalStatus(createClient(), animal.id, 'Adoptado');
            setAnimals((current) => current.map((a) => (a.id === animal.id ? { ...a, status: 'Adoptado' } : a)));
            toast.success(`${animal.name} ahora figura como adoptado`);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el expediente.');
          }
        },
      },
    });
  };

  const moveTo = async (request: AdoptionRequest, stage: AdoptionStage) => {
    setBusyId(request.id);
    try {
      const saved = await updateAdoption(createClient(), request.id, { stage });
      replace(saved);
      toast.success(`${request.applicant_name}: ${stage}`);
      if (stage === 'Aprobada') offerMarkAdopted(saved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo mover la solicitud.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaved = (saved: AdoptionRequest) => {
    const previous = requests.find((r) => r.id === saved.id);
    replace(saved);
    if (saved.stage === 'Aprobada' && previous?.stage !== 'Aprobada') offerMarkAdopted(saved);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteAdoption(createClient(), deleting.id);
      setRequests((current) => current.filter((r) => r.id !== deleting.id));
      toast.success('Solicitud eliminada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar.');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  useCreateParam(openCreate);

  const openEdit = (request: AdoptionRequest) => {
    setEditing(request);
    setFormOpen(true);
  };

  const rowActions = (request: AdoptionRequest) => {
    const next = nextStage(request.stage);
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Acciones para ${request.applicant_name}`} disabled={busyId === request.id}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {next ? (
            <DropdownMenuItem onSelect={() => void moveTo(request, next)}>
              <ArrowRight /> Avanzar a {next}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => openEdit(request)}>
            <PencilLine /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`mailto:${request.email}`}>
              <Mail /> Escribir correo
            </a>
          </DropdownMenuItem>
          {request.animal_id && animalsById.has(request.animal_id) ? (
            <DropdownMenuItem asChild>
              <Link href={`/animales/${request.animal_id}`}>
                <Eye /> Ver a {request.animal_name}
              </Link>
            </DropdownMenuItem>
          ) : null}
          {request.stage === 'Rechazada' ? (
            <DropdownMenuItem onSelect={() => void moveTo(request, 'Nueva')}>
              <RefreshCw /> Reabrir
            </DropdownMenuItem>
          ) : !isClosedStage(request.stage) ? (
            <DropdownMenuItem onSelect={() => void moveTo(request, 'Rechazada')}>
              <XCircle /> Rechazar
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDeleting(request)} className="text-destructive focus:bg-rose-50 focus:text-destructive">
            <Trash2 /> Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const staleBadge = (request: AdoptionRequest) =>
    isStale(request) ? (
      <Badge variant="warning" title={`Sin movimiento desde hace ${daysSinceUpdate(request)} días`}>
        <Clock className="h-3 w-3" /> {daysSinceUpdate(request)} d
      </Badge>
    ) : null;

  const emptyState = (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Heart className="h-6 w-6" />
      </div>
      <p className="mt-3 font-semibold">{requests.length === 0 ? 'Aún no hay solicitudes' : 'Sin resultados'}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {requests.length === 0 ? 'Registra la primera persona interesada en adoptar.' : 'Prueba con otro filtro o búsqueda.'}
      </p>
      {requests.length === 0 ? (
        <Button className="mt-4" onClick={openCreate}>
          <Plus /> Nueva solicitud
        </Button>
      ) : null}
    </div>
  );

  const toolbar = (
    <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
      {view === 'lista' ? (
        <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
          {['Activas', 'Estancadas', ...ADOPTION_STAGES, 'Todas'].map((stage) => (
            <FilterChip key={stage} active={stageFilter === stage} onClick={() => setStageFilter(stage)}>
              {stage}
            </FilterChip>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Usa <ArrowRight className="inline h-3.5 w-3.5" /> para avanzar cada solicitud. Las rechazadas se consultan en la vista de lista.
        </p>
      )}
      <div className="flex gap-2">
        <div className="w-32 shrink-0">
          <NativeSelect value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} aria-label="Filtrar por prioridad">
            <option>Todas</option>
            {ADOPTION_PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
          </NativeSelect>
        </div>
        <div className="relative min-w-0 flex-1 lg:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar persona, animal..." className="pl-9" aria-label="Buscar solicitudes" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Adopciones"
        title={view === 'lista' ? 'Solicitudes de adopción' : 'Tablero de adopción'}
        description="Da seguimiento a cada persona interesada, desde el primer contacto hasta la entrega."
        actions={
          <>
            <ViewToggle view={view} />
            <Button variant="outline" onClick={() => void load()} disabled={loading} aria-label="Recargar">
              <RefreshCw className={loading ? 'animate-spin' : undefined} />
            </Button>
            <Button onClick={openCreate}>
              <Plus /> Nueva solicitud
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label="En proceso" value={loading ? '—' : stats.active} icon={Heart} tone="sky" />
        <StatCard label="Nuevas sin revisar" value={loading ? '—' : stats.fresh} icon={Inbox} tone="amber" />
        <StatCard label="Aprobadas" value={loading ? '—' : stats.approved} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Estancadas" value={loading ? '—' : stats.stale} icon={Clock} tone="rose" hint={`Sin movimiento en ${STALE_AFTER_DAYS}+ días`} />
      </section>

      {loadError ? (
        <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">No se pudieron cargar los datos</p>
          <p className="mt-1">{loadError}</p>
        </Card>
      ) : view === 'lista' ? (
        <Card>
          {toolbar}
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            emptyState
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Animal</TableHead>
                      <TableHead>Etapa</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead>Último movimiento</TableHead>
                      <TableHead className="w-12"><span className="sr-only">Acciones</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <button type="button" onClick={() => openEdit(request)} className="group text-left">
                            <p className="font-semibold text-foreground group-hover:text-primary">{request.applicant_name}</p>
                            <p className="text-xs text-muted-foreground">{[request.city, request.housing !== 'Por confirmar' ? request.housing : null].filter(Boolean).join(' · ') || request.email}</p>
                          </button>
                        </TableCell>
                        <TableCell>
                          {request.animal_id && animalsById.has(request.animal_id) ? (
                            <Link href={`/animales/${request.animal_id}`} className="font-medium hover:text-primary">{request.animal_name}</Link>
                          ) : (
                            <span className="text-muted-foreground">{request.animal_name}</span>
                          )}
                        </TableCell>
                        <TableCell><Badge variant={adoptionStageVariant(request.stage)}>{request.stage}</Badge></TableCell>
                        <TableCell><Badge variant={adoptionPriorityVariant(request.priority)}>{request.priority}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{request.assignee || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {formatSince(request)} {staleBadge(request)}
                          </div>
                        </TableCell>
                        <TableCell>{rowActions(request)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="divide-y md:hidden">
                {filtered.map((request) => (
                  <li key={request.id} className="flex items-start gap-3 p-4">
                    <button type="button" onClick={() => openEdit(request)} className="min-w-0 flex-1 text-left">
                      <p className="font-semibold">{request.applicant_name}</p>
                      <p className="truncate text-xs text-muted-foreground">Quiere adoptar a {request.animal_name} · {formatSince(request)}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge variant={adoptionStageVariant(request.stage)}>{request.stage}</Badge>
                        <Badge variant={adoptionPriorityVariant(request.priority)}>{request.priority}</Badge>
                        {staleBadge(request)}
                      </div>
                    </button>
                    {rowActions(request)}
                  </li>
                ))}
              </ul>

              <p className="border-t px-4 py-3 text-xs text-muted-foreground">
                Mostrando {filtered.length} de {requests.length} solicitudes
              </p>
            </>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>{toolbar}</Card>
          <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            <div className="grid min-w-[880px] grid-cols-5 gap-3">
              {BOARD_STAGES.map((stage) => {
                const items = filtered.filter((request) => request.stage === stage);
                return (
                  <section key={stage} aria-label={stage} className="flex flex-col rounded-2xl border bg-muted/40 p-2">
                    <header className="flex items-center justify-between px-2 py-1.5">
                      <Badge variant={adoptionStageVariant(stage)}>{stage}</Badge>
                      <span className="text-xs font-semibold text-muted-foreground">{loading ? '…' : items.length}</span>
                    </header>
                    <div className="mt-1 flex flex-1 flex-col gap-2">
                      {loading ? (
                        <Skeleton className="h-24 w-full" />
                      ) : items.length === 0 ? (
                        <p className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">Sin solicitudes</p>
                      ) : (
                        items.map((request) => {
                          const next = nextStage(request.stage);
                          return (
                            <article key={request.id} className={cn('rounded-xl border bg-card p-3 shadow-sm', isStale(request) && 'border-amber-300')}>
                              <div className="flex items-start justify-between gap-2">
                                <button type="button" onClick={() => openEdit(request)} className="min-w-0 text-left">
                                  <p className="truncate text-sm font-semibold hover:text-primary">{request.applicant_name}</p>
                                  <p className="truncate text-xs text-muted-foreground">{request.animal_name}</p>
                                </button>
                                <div className="-mr-1 -mt-1 shrink-0">{rowActions(request)}</div>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <Badge variant={adoptionPriorityVariant(request.priority)}>{request.priority}</Badge>
                                {staleBadge(request)}
                              </div>
                              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span className="truncate">{request.assignee || 'Sin responsable'}</span>
                                {next ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                    disabled={busyId === request.id}
                                    onClick={() => void moveTo(request, next)}
                                    aria-label={`Avanzar a ${next}`}
                                    title={`Avanzar a ${next}`}
                                  >
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </Button>
                                ) : null}
                              </div>
                            </article>
                          );
                        })
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <AdoptionFormDialog open={formOpen} onOpenChange={setFormOpen} request={editing} animals={animals} onSaved={handleSaved} />
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="¿Eliminar esta solicitud?"
        description={`Se borrará la solicitud de ${deleting?.applicant_name ?? ''}. Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
