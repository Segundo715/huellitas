import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { readDemoValue, writeDemoValue } from '@/lib/demo-storage';

export const INVENTORY_CATEGORIES = ['Alimentos', 'Medicamentos', 'Material médico', 'Accesorios', 'Limpieza'] as const;
export const INVENTORY_UNITS = ['unidad', 'kg', 'caja', 'paquete', 'litro', 'bolsa'] as const;

export type InventoryStatus = 'Suficiente' | 'Bajo stock' | 'Por caducar' | 'Caducado' | 'Agotado';

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  stock: number;
  min_stock: number;
  expiry_date: string | null;
  unit: string;
  status: string;
  created_at?: string;
  updated_at?: string;
};

const EXPIRY_WARNING_DAYS = 30;

function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function daysUntil(date: string) {
  const target = new Date(`${date}T00:00:00`).getTime();
  const today = new Date(`${todayIso()}T00:00:00`).getTime();
  return Math.round((target - today) / 86_400_000);
}

// El estado se calcula a partir de los datos para que nunca quede desactualizado.
export function computeInventoryStatus(item: Pick<InventoryItem, 'stock' | 'min_stock' | 'expiry_date'>): InventoryStatus {
  if (item.expiry_date && daysUntil(item.expiry_date) < 0) return 'Caducado';
  if (item.stock <= 0) return 'Agotado';
  if (item.expiry_date && daysUntil(item.expiry_date) <= EXPIRY_WARNING_DAYS) return 'Por caducar';
  if (item.stock <= item.min_stock) return 'Bajo stock';
  return 'Suficiente';
}

export function inventoryStatusVariant(status: string) {
  switch (status) {
    case 'Suficiente':
      return 'success' as const;
    case 'Bajo stock':
    case 'Por caducar':
      return 'warning' as const;
    case 'Caducado':
    case 'Agotado':
      return 'danger' as const;
    default:
      return 'neutral' as const;
  }
}

const wholeNumber = (label: string) =>
  z
    .string()
    .trim()
    .transform((value) => Number(value || 0))
    .refine((value) => Number.isFinite(value) && value >= 0 && value <= 1_000_000, `${label} debe ser un número positivo.`);

export const inventoryFormSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre es obligatorio.').max(120, 'Máximo 120 caracteres.'),
    category: z.enum(INVENTORY_CATEGORIES),
    stock: wholeNumber('El stock'),
    min_stock: wholeNumber('El stock mínimo'),
    expiry_date: z
      .string()
      .trim()
      .refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Fecha inválida.')
      .transform((value) => value || null),
    unit: z.string().trim().min(1, 'Indica la unidad.').max(30),
  })
  .transform((values) => ({ ...values, status: computeInventoryStatus(values) }));

export type InventoryFormValues = z.input<typeof inventoryFormSchema>;
export type InventoryPayload = z.output<typeof inventoryFormSchema>;

export const emptyInventoryForm: InventoryFormValues = {
  name: '',
  category: 'Alimentos',
  stock: '0',
  min_stock: '0',
  expiry_date: '',
  unit: 'unidad',
};

export function inventoryToForm(item: InventoryItem): InventoryFormValues {
  return {
    name: item.name,
    category: (INVENTORY_CATEGORIES as readonly string[]).includes(item.category) ? (item.category as InventoryFormValues['category']) : 'Accesorios',
    stock: String(item.stock),
    min_stock: String(item.min_stock),
    expiry_date: item.expiry_date ?? '',
    unit: item.unit,
  };
}

const DEMO_KEY = 'huellitas-demo-inventory';
const SELECT_COLUMNS = 'id,name,category,stock,min_stock,expiry_date,unit,status,created_at,updated_at';

const demoSeed: InventoryItem[] = [
  { id: 'demo-1', name: 'Croquetas Premium', category: 'Alimentos', stock: 75, min_stock: 30, expiry_date: '2027-03-12', unit: 'kg', status: 'Suficiente' },
  { id: 'demo-2', name: 'Vitaminas caninas', category: 'Medicamentos', stock: 18, min_stock: 25, expiry_date: '2027-01-04', unit: 'caja', status: 'Bajo stock' },
  { id: 'demo-3', name: 'Gasas esterilizadas', category: 'Material médico', stock: 32, min_stock: 20, expiry_date: '2026-10-29', unit: 'paquete', status: 'Por caducar' },
  { id: 'demo-4', name: 'Desinfectante', category: 'Limpieza', stock: 0, min_stock: 5, expiry_date: null, unit: 'litro', status: 'Agotado' },
];

function readDemoItems() {
  return readDemoValue<InventoryItem[]>(DEMO_KEY, demoSeed);
}

function fail(action: string, error: { message: string; code?: string }): never {
  if (error.code === '42501' || /row-level security/i.test(error.message)) {
    throw new Error(`No tienes permiso para ${action}.`);
  }
  if (error.code === '42P01' || /does not exist/i.test(error.message)) {
    throw new Error('La tabla inventory_items no existe. Ejecuta supabase-schema.sql en el SQL Editor.');
  }
  throw new Error(`No se pudo ${action}: ${error.message}`);
}

// El estado guardado puede quedar viejo (p. ej. algo caduca con el paso de los días); lo recalculamos al leer.
function withFreshStatus(items: InventoryItem[]) {
  return items.map((item) => ({ ...item, status: computeInventoryStatus(item) }));
}

export async function listInventory(supabase: SupabaseClient | null): Promise<InventoryItem[]> {
  if (!supabase) return withFreshStatus(readDemoItems());

  const { data, error } = await supabase.from('inventory_items').select(SELECT_COLUMNS).order('name', { ascending: true });
  if (error) fail('cargar el inventario', error);
  return withFreshStatus(data as InventoryItem[]);
}

export async function createInventoryItem(supabase: SupabaseClient | null, payload: InventoryPayload): Promise<InventoryItem> {
  if (!supabase) {
    const item: InventoryItem = { id: crypto.randomUUID(), ...payload, created_at: new Date().toISOString() };
    writeDemoValue(DEMO_KEY, [item, ...readDemoItems()]);
    return item;
  }

  const { data, error } = await supabase.from('inventory_items').insert(payload).select(SELECT_COLUMNS).single();
  if (error) fail('crear el insumo', error);
  return data as InventoryItem;
}

export async function updateInventoryItem(supabase: SupabaseClient | null, id: string, payload: Partial<InventoryPayload>): Promise<InventoryItem> {
  if (!supabase) {
    const items = readDemoItems();
    const existing = items.find((item) => item.id === id);
    if (!existing) throw new Error('El insumo ya no existe.');
    const merged = { ...existing, ...payload };
    const updated: InventoryItem = { ...merged, status: computeInventoryStatus(merged), updated_at: new Date().toISOString() };
    writeDemoValue(DEMO_KEY, items.map((item) => (item.id === id ? updated : item)));
    return updated;
  }

  const { data, error } = await supabase.from('inventory_items').update(payload).eq('id', id).select(SELECT_COLUMNS).single();
  if (error) fail('actualizar el insumo', error);
  return data as InventoryItem;
}

// Ajuste rápido de stock (+/-) que también recalcula el estado.
export async function adjustInventoryStock(supabase: SupabaseClient | null, item: InventoryItem, delta: number): Promise<InventoryItem> {
  const stock = Math.max(0, item.stock + delta);
  return updateInventoryItem(supabase, item.id, { stock, status: computeInventoryStatus({ ...item, stock }) });
}

export async function deleteInventoryItem(supabase: SupabaseClient | null, id: string): Promise<void> {
  if (!supabase) {
    writeDemoValue(DEMO_KEY, readDemoItems().filter((item) => item.id !== id));
    return;
  }

  const { error } = await supabase.from('inventory_items').delete().eq('id', id);
  if (error) fail('eliminar el insumo', error);
}

export function inventoryAlerts(items: InventoryItem[]) {
  return items
    .filter((item) => item.status !== 'Suficiente')
    .map((item) => {
      const detail =
        item.status === 'Caducado'
          ? 'caducó'
          : item.status === 'Agotado'
            ? 'está agotado'
            : item.status === 'Por caducar' && item.expiry_date
              ? `caduca en ${daysUntil(item.expiry_date)} días`
              : `quedan ${item.stock} ${item.unit} (mín. ${item.min_stock})`;
      return { id: item.id, status: item.status, text: `${item.name}: ${detail}` };
    });
}
