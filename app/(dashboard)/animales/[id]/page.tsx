'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarClock, ClipboardList, Loader2, MapPin, PawPrint, PencilLine, Scale, Send, Trash2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { AnimalFormDialog } from '@/components/animals/animal-form-dialog';
import { useAuth } from '@/components/auth-provider';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { RoleGuard } from '@/components/role-guard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { STAFF_ROLES } from '@/lib/auth/roles';
import {
  addAnimalNote,
  animalStatusVariant,
  deleteAnimal,
  deleteAnimalNote,
  getAnimal,
  listAnimalNotes,
  type Animal,
  type AnimalNote,
} from '@/lib/data/animals';
import { useDemoValue } from '@/lib/demo-storage';
import { calendarEntries } from '@/lib/mock-data';
import { createClient } from '@/lib/supabase/client';

type AgendaEntry = { id: number; title: string; date: string; time: string; type: string; assignee: string; status: string; animalId?: string };

const dateFormatter = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function AnimalDetail({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [notes, setNotes] = useState<AnimalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [agenda] = useDemoValue<AgendaEntry[]>('huellitas-demo-calendar-entries', calendarEntries);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const [record, history] = await Promise.all([getAnimal(supabase, id), listAnimalNotes(supabase, id)]);
      setAnimal(record);
      setNotes(history);
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudo cargar el expediente.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAddNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      const note = await addAnimalNote(createClient(), id, noteText, user?.email ?? null);
      setNotes((current) => [note, ...current]);
      setNoteText('');
      toast.success('Nota añadida al historial');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la nota.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteAnimalNote(createClient(), noteId);
      setNotes((current) => current.filter((note) => note.id !== noteId));
      toast.success('Nota eliminada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar la nota.');
    }
  };

  const handleDeleteAnimal = async () => {
    if (!animal) return;
    try {
      await deleteAnimal(createClient(), animal.id);
      toast.success(`Expediente de ${animal.name} eliminado`);
      router.replace('/animales');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (loadError || !animal) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <PawPrint className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold">{loadError ? 'No se pudo cargar' : 'Expediente no encontrado'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{loadError || 'Es posible que haya sido eliminado.'}</p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/animales">
            <ArrowLeft /> Volver a expedientes
          </Link>
        </Button>
      </Card>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = agenda
    .filter((entry) => entry.animalId === id && entry.date >= today)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const missing = [
    !animal.breed && 'raza',
    (!animal.sex || animal.sex === 'No especificado') && 'sexo',
    animal.weight_kg == null && 'peso',
    !animal.location && 'ubicación',
    !animal.notes && 'notas generales',
    !animal.photo_webp && 'foto',
  ].filter(Boolean) as string[];

  const facts = [
    { label: 'Especie', value: animal.type },
    { label: 'Raza', value: animal.breed || 'No especificada' },
    { label: 'Sexo', value: animal.sex || 'No especificado' },
    { label: 'Edad', value: `${animal.age_years} años` },
    { label: 'Peso', value: animal.weight_kg != null ? `${animal.weight_kg} kg` : 'No registrado' },
    { label: 'Ubicación', value: animal.location || 'Sin asignar' },
  ];

  return (
    <div className="space-y-6">
      <Link href="/animales" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Expedientes
      </Link>

      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-sky-500 via-sky-400 to-indigo-400 sm:h-24" />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div className="flex items-end gap-4">
            <div className="-mt-10 shrink-0 rounded-2xl border-4 border-card bg-card shadow-lg">
              {animal.photo_webp ? (
                <Image src={animal.photo_webp} alt={animal.name} width={96} height={96} unoptimized className="h-24 w-24 rounded-xl object-cover" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <PawPrint aria-hidden="true" className="h-10 w-10" />
                </div>
              )}
            </div>
            <div className="pb-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{animal.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant={animalStatusVariant(animal.status)}>{animal.status}</Badge>
                <span>{animal.type} · {animal.breed || 'Raza no especificada'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <PencilLine /> Editar
            </Button>
            <Button variant="outline" onClick={() => setDeleteOpen(true)} className="text-destructive hover:bg-rose-50 hover:text-destructive" aria-label="Eliminar expediente">
              <Trash2 />
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><CalendarClock className="h-5 w-5" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Próxima cita</p>
            <p className="font-semibold">
              {upcoming[0] ? `${new Date(`${upcoming[0].date}T00:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} · ${upcoming[0].time}` : 'Sin programar'}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><ClipboardList className="h-5 w-5" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Notas en historial</p>
            <p className="font-semibold">{notes.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><TriangleAlert className="h-5 w-5" /></div>
          <div>
            <p className="text-sm text-muted-foreground">Datos por completar</p>
            <p className="font-semibold">{missing.length}</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Datos del animal</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {facts.map((fact) => (
                  <div key={fact.label} className="rounded-xl bg-muted/60 p-3">
                    <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                    <dd className="mt-0.5 font-semibold">{fact.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 rounded-xl bg-muted/60 p-3">
                <p className="text-xs text-muted-foreground">Notas generales</p>
                <p className="mt-0.5 whitespace-pre-line text-sm">{animal.notes || 'Sin notas generales.'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial médico y observaciones</CardTitle>
              <CardDescription>Cada nota queda registrada con fecha y autor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <form onSubmit={handleAddNote} className="space-y-2">
                <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={3} placeholder="Ej. Se aplicó vacuna antirrábica. Buen apetito." maxLength={2000} />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={savingNote || !noteText.trim()}>
                    {savingNote ? <Loader2 className="animate-spin" /> : <Send />}
                    Añadir nota
                  </Button>
                </div>
              </form>

              {notes.length === 0 ? (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Todavía no hay observaciones registradas.</p>
              ) : (
                <ol className="relative space-y-4 border-l-2 border-sky-100 pl-5">
                  {notes.map((note) => (
                    <li key={note.id} className="group relative">
                      <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-card bg-sky-500" />
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {dateFormatter.format(new Date(note.created_at))}
                            {note.author_email ? ` · ${note.author_email}` : ''}
                          </p>
                          <p className="mt-1 whitespace-pre-line text-sm">{note.body}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void handleDeleteNote(note.id)}
                          aria-label="Eliminar nota"
                          className="h-8 w-8 shrink-0 text-muted-foreground opacity-100 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Próximas citas</CardTitle>
              <Link href="/agenda" className="text-sm font-semibold text-primary hover:underline">Agenda</Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcoming.length ? (
                upcoming.map((entry) => (
                  <div key={entry.id} className="rounded-xl border p-3">
                    <p className="font-semibold">{entry.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(`${entry.date}T00:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })} · {entry.time}
                    </p>
                    <p className="text-xs text-muted-foreground">{entry.type} · {entry.assignee}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No hay citas vinculadas a este animal.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Completar expediente</CardTitle>
            </CardHeader>
            <CardContent>
              {missing.length ? (
                <ul className="space-y-2">
                  {missing.map((item) => (
                    <li key={item} className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <TriangleAlert className="h-4 w-4 shrink-0" /> Falta registrar {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">El expediente está completo.</p>
              )}
              {missing.length ? (
                <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setEditOpen(true)}>
                  Completar datos
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {animal.location || 'Sin ubicación'}
            </div>
            <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
              <Scale className="h-4 w-4" /> {animal.weight_kg != null ? `${animal.weight_kg} kg` : 'Peso no registrado'}
            </div>
          </Card>
        </div>
      </div>

      <AnimalFormDialog open={editOpen} onOpenChange={setEditOpen} animal={animal} onSaved={setAnimal} />
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`¿Eliminar a ${animal.name}?`}
        description="Se borrará el expediente y todo su historial. Esta acción no se puede deshacer."
        onConfirm={handleDeleteAnimal}
      />
    </div>
  );
}

export default function AnimalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <AnimalDetail id={id} />
    </RoleGuard>
  );
}
