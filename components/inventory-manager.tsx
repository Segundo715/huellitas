'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, CalendarX, Loader2, Minus, MoreHorizontal, PackageX, PencilLine, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { FilterChip, PageHeader, StatCard } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  INVENTORY_CATEGORIES,
  INVENTORY_UNITS,
  adjustInventoryStock,
  computeInventoryStatus,
  createInventoryItem,
  daysUntil,
  deleteInventoryItem,
  emptyInventoryForm,
  inventoryFormSchema,
  inventoryStatusVariant,
  inventoryToForm,
  listInventory,
  updateInventoryItem,
  type InventoryFormValues,
  type InventoryItem,
} from '@/lib/data/inventory';
import { createClient } from '@/lib/supabase/client';
import { useCreateParam } from '@/lib/use-create-param';
import { cn } from '@/lib/utils';

type FieldErrors = Partial<Record<keyof InventoryFormValues, string>>;

const STATUS_FILTERS = ['Todos', 'Requiere atención', 'Suficiente'] as const;

function InventoryFormDialog({
  open,
  onOpenChange,
  item,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  onSaved: (item: InventoryItem) => void;
}) {
  const [form, setForm] = useState<InventoryFormValues>(emptyInventoryForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(item ? inventoryToForm(item) : emptyInventoryForm);
      setErrors({});
    }
  }, [open, item]);

  const set = (field: keyof InventoryFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  // Vista previa del estado que se calculará al guardar.
  const previewStatus = computeInventoryStatus({
    stock: Number(form.stock) || 0,
    min_stock: Number(form.min_stock) || 0,
    expiry_date: form.expiry_date || null,
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = inventoryFormSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof InventoryFormValues;
        nextErrors[field] ??= issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const saved = item ? await updateInventoryItem(supabase, item.id, parsed.data) : await createInventoryItem(supabase, parsed.data);
      toast.success(item ? `${saved.name} actualizado` : `${saved.name} añadido al inventario`);
      onSaved({ ...saved, status: computeInventoryStatus(saved) });
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
          <DialogTitle>{item ? 'Editar insumo' : 'Nuevo insumo'}</DialogTitle>
          <DialogDescription>El estado se calcula automáticamente según stock y caducidad.</DialogDescription>
        </DialogHeader>

        <form id="inventory-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="inv-name">Nombre *</Label>
            <Input id="inv-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Croquetas Premium" aria-invalid={Boolean(errors.name)} />
            {errors.name ? <p className="text-xs font-medium text-destructive">{errors.name}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-category">Categoría</Label>
            <NativeSelect id="inv-category" value={form.category} onChange={(e) => set('category', e.target.value)}>
              {INVENTORY_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-unit">Unidad</Label>
            <Input id="inv-unit" list="inv-units" value={form.unit} onChange={(e) => set('unit', e.target.value)} aria-invalid={Boolean(errors.unit)} />
            <datalist id="inv-units">
              {INVENTORY_UNITS.map((unit) => <option key={unit} value={unit} />)}
            </datalist>
            {errors.unit ? <p className="text-xs font-medium text-destructive">{errors.unit}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-stock">Stock actual</Label>
            <Input id="inv-stock" type="number" min="0" inputMode="numeric" value={form.stock} onChange={(e) => set('stock', e.target.value)} aria-invalid={Boolean(errors.stock)} />
            {errors.stock ? <p className="text-xs font-medium text-destructive">{errors.stock}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-min">Stock mínimo</Label>
            <Input id="inv-min" type="number" min="0" inputMode="numeric" value={form.min_stock} onChange={(e) => set('min_stock', e.target.value)} aria-invalid={Boolean(errors.min_stock)} />
            {errors.min_stock ? <p className="text-xs font-medium text-destructive">{errors.min_stock}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="inv-expiry">Caducidad</Label>
            <Input id="inv-expiry" type="date" value={form.expiry_date} onChange={(e) => set('expiry_date', e.target.value)} aria-invalid={Boolean(errors.expiry_date)} />
          </div>
          <div className="space-y-2">
            <Label>Estado resultante</Label>
            <div className="flex h-10 items-center">
              <Badge variant={inventoryStatusVariant(previewStatus)}>{previewStatus}</Badge>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="inventory-form" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            {item ? 'Guardar cambios' : 'Añadir insumo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StockBar({ item }: { item: InventoryItem }) {
  const target = Math.max(item.min_stock * 2, 1);
  const percent = Math.min(100, Math.round((item.stock / target) * 100));
  const tone = item.stock <= 0 ? 'bg-rose-500' : item.stock <= item.min_stock ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${percent}%` }} />
    </div>
  );
}

function ExpiryLabel({ date }: { date: string | null }) {
  if (!date) return <span className="text-muted-foreground">—</span>;
  const days = daysUntil(date);
  const formatted = new Date(`${date}T00:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <div>
      <p className="text-sm">{formatted}</p>
      <p className={cn('text-xs', days < 0 ? 'text-rose-600' : days <= 30 ? 'text-amber-700' : 'text-muted-foreground')}>
        {days < 0 ? `Caducó hace ${Math.abs(days)} d` : days === 0 ? 'Caduca hoy' : `En ${days} d`}
      </p>
    </div>
  );
}

export function InventoryManager() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('Todos');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listInventory(createClient()));
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudo cargar el inventario.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () => ({
      total: items.length,
      low: items.filter((i) => i.status === 'Bajo stock' || i.status === 'Agotado').length,
      expiring: items.filter((i) => i.status === 'Por caducar').length,
      expired: items.filter((i) => i.status === 'Caducado').length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== 'Todas' && item.category !== category) return false;
      if (statusFilter === 'Requiere atención' && item.status === 'Suficiente') return false;
      if (statusFilter === 'Suficiente' && item.status !== 'Suficiente') return false;
      return !query || item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query);
    });
  }, [items, search, category, statusFilter]);

  const upsert = (saved: InventoryItem) => {
    setItems((current) => (current.some((i) => i.id === saved.id) ? current.map((i) => (i.id === saved.id ? saved : i)) : [saved, ...current]));
  };

  const adjust = async (item: InventoryItem, delta: number) => {
    setAdjustingId(item.id);
    try {
      const updated = await adjustInventoryStock(createClient(), item, delta);
      upsert({ ...updated, status: computeInventoryStatus(updated) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo ajustar el stock.');
    } finally {
      setAdjustingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteInventoryItem(createClient(), deleting.id);
      setItems((current) => current.filter((i) => i.id !== deleting.id));
      toast.success(`${deleting.name} eliminado`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar.');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  useCreateParam(openCreate);

  const stockControls = (item: InventoryItem) => (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => void adjust(item, -1)} disabled={adjustingId === item.id || item.stock <= 0} aria-label={`Restar 1 a ${item.name}`}>
        <Minus className="!size-3" />
      </Button>
      <span className="min-w-[4.5rem] text-center text-sm font-semibold tabular-nums">
        {item.stock} <span className="font-normal text-muted-foreground">{item.unit}</span>
      </span>
      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => void adjust(item, 1)} disabled={adjustingId === item.id} aria-label={`Sumar 1 a ${item.name}`}>
        <Plus className="!size-3" />
      </Button>
    </div>
  );

  const rowActions = (item: InventoryItem) => (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Acciones para ${item.name}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() => {
            setEditing(item);
            setFormOpen(true);
          }}
        >
          <PencilLine /> Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setDeleting(item)} className="text-destructive focus:bg-rose-50 focus:text-destructive">
          <Trash2 /> Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventario"
        title="Stock y materiales"
        description="Alimentos, medicamentos y material del refugio."
        actions={
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading} aria-label="Recargar">
              <RefreshCw className={loading ? 'animate-spin' : undefined} />
            </Button>
            <Button onClick={openCreate}>
              <Plus /> Nuevo insumo
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Artículos" value={loading ? '—' : stats.total} icon={Boxes} tone="violet" />
        <StatCard label="Bajo stock / agotado" value={loading ? '—' : stats.low} icon={PackageX} tone="amber" />
        <StatCard label="Por caducar (30 d)" value={loading ? '—' : stats.expiring} icon={AlertTriangle} tone="amber" />
        <StatCard label="Caducados" value={loading ? '—' : stats.expired} icon={CalendarX} tone="rose" />
      </section>

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {STATUS_FILTERS.map((status) => (
              <FilterChip key={status} active={statusFilter === status} onClick={() => setStatusFilter(status)}>
                {status}
              </FilterChip>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="w-40 shrink-0">
              <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filtrar por categoría">
                <option>Todas</option>
                {INVENTORY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </NativeSelect>
            </div>
            <div className="relative min-w-0 flex-1 lg:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar insumo..." className="pl-9" aria-label="Buscar en inventario" />
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
            {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Boxes className="h-6 w-6" />
            </div>
            <p className="mt-3 font-semibold">{items.length === 0 ? 'El inventario está vacío' : 'Sin resultados'}</p>
            <p className="mt-1 text-sm text-muted-foreground">{items.length === 0 ? 'Añade el primer insumo.' : 'Prueba con otro filtro.'}</p>
            {items.length === 0 ? (
              <Button className="mt-4" onClick={openCreate}>
                <Plus /> Nuevo insumo
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Insumo</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="w-40">Nivel</TableHead>
                    <TableHead>Caducidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-12"><span className="sr-only">Acciones</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </TableCell>
                      <TableCell>{stockControls(item)}</TableCell>
                      <TableCell>
                        <StockBar item={item} />
                        <p className="mt-1 text-xs text-muted-foreground">Mínimo {item.min_stock}</p>
                      </TableCell>
                      <TableCell><ExpiryLabel date={item.expiry_date} /></TableCell>
                      <TableCell><Badge variant={inventoryStatusVariant(item.status)}>{item.status}</Badge></TableCell>
                      <TableCell>{rowActions(item)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="divide-y md:hidden">
              {filtered.map((item) => (
                <li key={item.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category}{item.expiry_date ? ` · caduca ${item.expiry_date}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={inventoryStatusVariant(item.status)}>{item.status}</Badge>
                      {rowActions(item)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {stockControls(item)}
                    <div className="flex-1"><StockBar item={item} /></div>
                  </div>
                </li>
              ))}
            </ul>

            <p className="border-t px-4 py-3 text-xs text-muted-foreground">
              Mostrando {filtered.length} de {items.length} insumos
            </p>
          </>
        )}
      </Card>

      <InventoryFormDialog open={formOpen} onOpenChange={setFormOpen} item={editing} onSaved={upsert} />
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`¿Eliminar ${deleting?.name ?? ''}?`}
        description="El insumo se quitará del inventario. Esta acción no se puede deshacer."
        onConfirm={handleDelete}
      />
    </div>
  );
}
