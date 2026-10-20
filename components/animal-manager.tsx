'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, HeartHandshake, MoreHorizontal, PawPrint, PencilLine, Plus, RefreshCw, Search, Stethoscope, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AnimalFormDialog } from '@/components/animals/animal-form-dialog';
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
import { ANIMAL_STATUSES, ANIMAL_TYPES, animalStatusVariant, deleteAnimal, listAnimals, type Animal } from '@/lib/data/animals';
import { createClient } from '@/lib/supabase/client';
import { useCreateParam } from '@/lib/use-create-param';

function AnimalAvatar({ animal, size = 40 }: { animal: Animal; size?: number }) {
  return animal.photo_webp ? (
    <Image src={animal.photo_webp} alt={animal.name} width={size} height={size} unoptimized className="shrink-0 rounded-xl object-cover" style={{ width: size, height: size }} />
  ) : (
    <div className="flex shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground" style={{ width: size, height: size }}>
      <PawPrint aria-hidden="true" className="h-1/2 w-1/2" />
    </div>
  );
}

function formatAge(years: number) {
  if (years < 1) {
    const months = Math.round(years * 12);
    return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  }
  return `${Number.isInteger(years) ? years : years.toFixed(1)} ${years === 1 ? 'año' : 'años'}`;
}

export function AnimalManager() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [typeFilter, setTypeFilter] = useState<string>('Todos');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Animal | null>(null);
  const [deleting, setDeleting] = useState<Animal | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAnimals(await listAnimals(createClient()));
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los animales.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () => ({
      total: animals.length,
      available: animals.filter((a) => a.status === 'Disponible').length,
      treatment: animals.filter((a) => a.status === 'En tratamiento').length,
      adopted: animals.filter((a) => a.status === 'Adoptado').length,
    }),
    [animals],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return animals.filter((animal) => {
      if (statusFilter !== 'Todos' && animal.status !== statusFilter) return false;
      if (typeFilter !== 'Todos' && animal.type !== typeFilter) return false;
      if (!query) return true;
      return [animal.name, animal.breed, animal.location].some((value) => value?.toLowerCase().includes(query));
    });
  }, [animals, search, statusFilter, typeFilter]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  useCreateParam(openCreate);

  const openEdit = (animal: Animal) => {
    setEditing(animal);
    setFormOpen(true);
  };

  const handleSaved = (saved: Animal) => {
    setAnimals((current) => (current.some((a) => a.id === saved.id) ? current.map((a) => (a.id === saved.id ? saved : a)) : [saved, ...current]));
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteAnimal(createClient(), deleting.id);
      setAnimals((current) => current.filter((a) => a.id !== deleting.id));
      toast.success(`Expediente de ${deleting.name} eliminado`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar.');
    }
  };

  // modal={false}: evita que Radix deje el body bloqueado al abrir un diálogo desde el menú.
  const rowActions = (animal: Animal) => (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Acciones para ${animal.name}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/animales/${animal.id}`}>
            <Eye /> Ver expediente
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openEdit(animal)}>
          <PencilLine /> Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setDeleting(animal)} className="text-destructive focus:bg-rose-50 focus:text-destructive">
          <Trash2 /> Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Animales"
        title="Expedientes"
        description="Registro de todos los animales del refugio."
        actions={
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading} aria-label="Recargar">
              <RefreshCw className={loading ? 'animate-spin' : undefined} />
            </Button>
            <Button onClick={openCreate}>
              <Plus /> Nuevo animal
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Total" value={loading ? '—' : stats.total} icon={PawPrint} tone="sky" />
        <StatCard label="Disponibles" value={loading ? '—' : stats.available} icon={HeartHandshake} tone="emerald" />
        <StatCard label="En tratamiento" value={loading ? '—' : stats.treatment} icon={Stethoscope} tone="amber" />
        <StatCard label="Adoptados" value={loading ? '—' : stats.adopted} icon={HeartHandshake} tone="violet" />
      </section>

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {['Todos', ...ANIMAL_STATUSES].map((status) => (
              <FilterChip key={status} active={statusFilter === status} onClick={() => setStatusFilter(status)}>
                {status}
              </FilterChip>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="w-32 shrink-0">
              <NativeSelect value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filtrar por especie">
                <option>Todos</option>
                {ANIMAL_TYPES.map((type) => <option key={type}>{type}</option>)}
              </NativeSelect>
            </div>
            <div className="relative min-w-0 flex-1 lg:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nombre, raza..." className="pl-9" aria-label="Buscar animales" />
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <p className="font-semibold">No se pudieron cargar los datos</p>
            <p className="mt-1">{loadError}</p>
          </div>
        ) : loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <PawPrint className="h-6 w-6" />
            </div>
            <p className="mt-3 font-semibold">{animals.length === 0 ? 'Aún no hay expedientes' : 'Sin resultados'}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {animals.length === 0 ? 'Registra el primer animal del refugio.' : 'Prueba con otro filtro o búsqueda.'}
            </p>
            {animals.length === 0 ? (
              <Button className="mt-4" onClick={openCreate}>
                <Plus /> Nuevo animal
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            {/* Escritorio: tabla */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Animal</TableHead>
                    <TableHead>Especie</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-12"><span className="sr-only">Acciones</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((animal) => (
                    <TableRow key={animal.id}>
                      <TableCell>
                        <Link href={`/animales/${animal.id}`} className="group flex items-center gap-3">
                          <AnimalAvatar animal={animal} />
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground group-hover:text-primary">{animal.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{animal.breed || 'Sin raza'}{animal.sex && animal.sex !== 'No especificado' ? ` · ${animal.sex}` : ''}</p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{animal.type}</TableCell>
                      <TableCell className="text-muted-foreground">{formatAge(animal.age_years)}</TableCell>
                      <TableCell className="text-muted-foreground">{animal.location || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={animalStatusVariant(animal.status)}>{animal.status}</Badge>
                      </TableCell>
                      <TableCell>{rowActions(animal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Móvil: tarjetas */}
            <ul className="divide-y md:hidden">
              {filtered.map((animal) => (
                <li key={animal.id} className="flex items-center gap-3 p-4">
                  <Link href={`/animales/${animal.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <AnimalAvatar animal={animal} size={48} />
                    <div className="min-w-0">
                      <p className="font-semibold">{animal.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{animal.type} · {animal.breed || 'Sin raza'} · {formatAge(animal.age_years)}</p>
                      <Badge variant={animalStatusVariant(animal.status)} className="mt-1.5">{animal.status}</Badge>
                    </div>
                  </Link>
                  {rowActions(animal)}
                </li>
              ))}
            </ul>

            <p className="border-t px-4 py-3 text-xs text-muted-foreground">
              Mostrando {filtered.length} de {animals.length} animales
            </p>
          </>
        )}
      </Card>

      <AnimalFormDialog open={formOpen} onOpenChange={setFormOpen} animal={editing} onSaved={handleSaved} />
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`¿Eliminar a ${deleting?.name ?? ''}?`}
        description="Se borrará el expediente y su historial de notas. Esta acción no se puede deshacer."
        onConfirm={handleDelete}
      />
    </div>
  );
}
