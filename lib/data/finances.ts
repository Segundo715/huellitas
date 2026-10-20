import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { readDemoValue, writeDemoValue } from '@/lib/demo-storage';

export const TRANSACTION_KINDS = ['ingreso', 'gasto'] as const;
export const INCOME_CATEGORIES = ['Donación individual', 'Fundación o empresa', 'Evento o campaña', 'Cuota de adopción', 'Otro ingreso'] as const;
export const EXPENSE_CATEGORIES = ['Alimentos', 'Salud veterinaria', 'Limpieza', 'Mantenimiento', 'Operación', 'Otro gasto'] as const;
export const PAYMENT_METHODS = ['Transferencia', 'Efectivo', 'Tarjeta', 'Otro'] as const;

export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

export type Transaction = {
  id: string;
  kind: TransactionKind;
  concept: string;
  category: string;
  amount: number;
  date: string;
  method: string;
  contact: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
};

export function categoriesFor(kind: TransactionKind): readonly string[] {
  return kind === 'ingreso' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((value) => value || null);

export const transactionFormSchema = z
  .object({
    kind: z.enum(TRANSACTION_KINDS),
    concept: z.string().trim().min(1, 'El concepto es obligatorio.').max(120, 'Máximo 120 caracteres.'),
    category: z.string().trim().min(1, 'Elige una categoría.'),
    amount: z
      .string()
      .trim()
      .transform((value) => Number(value.replace(',', '.')))
      .refine((value) => Number.isFinite(value) && value > 0 && value <= 10_000_000, 'Importe mayor a 0.')
      .transform((value) => Math.round(value * 100) / 100),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida.'),
    method: z.enum(PAYMENT_METHODS),
    contact: optionalText(120),
    notes: optionalText(1000),
  })
  .refine((value) => categoriesFor(value.kind).includes(value.category), { path: ['category'], message: 'Categoría no válida para este tipo.' });

export type TransactionFormValues = z.input<typeof transactionFormSchema>;
export type TransactionPayload = z.output<typeof transactionFormSchema>;

export function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function emptyTransactionForm(kind: TransactionKind = 'ingreso'): TransactionFormValues {
  return { kind, concept: '', category: categoriesFor(kind)[0], amount: '', date: todayIso(), method: 'Transferencia', contact: '', notes: '' };
}

export function transactionToForm(item: Transaction): TransactionFormValues {
  return {
    kind: item.kind,
    concept: item.concept,
    category: categoriesFor(item.kind).includes(item.category) ? item.category : categoriesFor(item.kind).at(-1)!,
    amount: String(item.amount),
    date: item.date,
    method: (PAYMENT_METHODS as readonly string[]).includes(item.method) ? (item.method as TransactionFormValues['method']) : 'Otro',
    contact: item.contact ?? '',
    notes: item.notes ?? '',
  };
}

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
const compactCurrency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', notation: 'compact', maximumFractionDigits: 1 });

export function formatMoney(value: number) {
  return currency.format(value);
}

export function formatMoneyCompact(value: number) {
  return compactCurrency.format(value);
}

export function formatDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Resumen mensual de los últimos `months` meses (incluye el actual), del más antiguo al más reciente.
export function monthlyTotals(items: Transaction[], months = 6) {
  const now = new Date();
  const buckets = Array.from({ length: months }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '');
    return { key, label: label.charAt(0).toUpperCase() + label.slice(1), income: 0, expense: 0 };
  });
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  for (const item of items) {
    const bucket = byKey.get(item.date.slice(0, 7));
    if (!bucket) continue;
    if (item.kind === 'ingreso') bucket.income += item.amount;
    else bucket.expense += item.amount;
  }
  return buckets;
}

export function totalsFor(items: Transaction[]) {
  const income = items.filter((i) => i.kind === 'ingreso').reduce((sum, i) => sum + i.amount, 0);
  const expense = items.filter((i) => i.kind === 'gasto').reduce((sum, i) => sum + i.amount, 0);
  return { income, expense, balance: income - expense };
}

export function transactionsToCsv(items: Transaction[]) {
  const escape = (value: string | number | null) => {
    const text = value == null ? '' : String(value);
    // Evita que Excel interprete el texto como fórmula.
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const header = ['Fecha', 'Tipo', 'Concepto', 'Categoría', 'Importe', 'Método', 'Donante / proveedor', 'Notas'];
  const rows = items.map((i) => [i.date, i.kind === 'ingreso' ? 'Ingreso' : 'Gasto', i.concept, i.category, i.kind === 'ingreso' ? i.amount : -i.amount, i.method, i.contact, i.notes]);
  return [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
}

const DEMO_KEY = 'huellitas-demo-transactions-v2';
const LEGACY_KEY = 'huellitas-demo-financial-transactions';

const SELECT_COLUMNS = 'id,kind,concept,category,amount,date,method,contact,notes,created_at,updated_at';

type LegacyTransaction = { id: string; type: string; title: string; category: string; amount: number; date: string };

const legacyCategories: Record<string, string> = {
  Donación: 'Fundación o empresa',
  'Donante individual': 'Donación individual',
  Evento: 'Evento o campaña',
  Salud: 'Salud veterinaria',
  Alimentos: 'Alimentos',
  Operación: 'Operación',
};

// Datos demo repartidos en los últimos meses para que la gráfica tenga historia.
function demoSeed(): Transaction[] {
  const now = new Date();
  const day = (monthsAgo: number, dayOfMonth: number) => {
    const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.min(dayOfMonth, monthsAgo === 0 ? now.getDate() : 28));
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const rows: Array<[TransactionKind, string, string, number, number, number, string | null]> = [
    ['ingreso', 'Donativo mensual', 'Fundación o empresa', 2500, 0, 3, 'Fundación K9'],
    ['ingreso', 'Donación en línea', 'Donación individual', 800, 0, 5, 'Patricia Sol'],
    ['gasto', 'Vacunas y desparasitantes', 'Salud veterinaria', 1400, 0, 4, 'Clínica San Roque'],
    ['gasto', 'Croquetas premium', 'Alimentos', 1100, 0, 2, 'Distribuidora Can'],
    ['ingreso', 'Paseo solidario', 'Evento o campaña', 4200, 1, 20, null],
    ['ingreso', 'Donativo mensual', 'Fundación o empresa', 2500, 1, 3, 'Fundación K9'],
    ['gasto', 'Limpieza y desinfección', 'Limpieza', 890, 1, 12, null],
    ['gasto', 'Croquetas premium', 'Alimentos', 1250, 1, 6, 'Distribuidora Can'],
    ['ingreso', 'Cuota de adopción de Kiko', 'Cuota de adopción', 600, 2, 15, 'Elena T.'],
    ['ingreso', 'Donativo mensual', 'Fundación o empresa', 2500, 2, 3, 'Fundación K9'],
    ['gasto', 'Esterilizaciones', 'Salud veterinaria', 3200, 2, 18, 'Clínica San Roque'],
    ['ingreso', 'Colecta de verano', 'Evento o campaña', 3100, 3, 22, null],
    ['gasto', 'Reparación de jaulas', 'Mantenimiento', 1800, 3, 9, null],
    ['ingreso', 'Donación en línea', 'Donación individual', 1500, 4, 11, 'Carlos M.'],
    ['gasto', 'Croquetas premium', 'Alimentos', 1150, 4, 6, 'Distribuidora Can'],
    ['ingreso', 'Donativo mensual', 'Fundación o empresa', 2500, 5, 3, 'Fundación K9'],
    ['gasto', 'Servicio de agua y luz', 'Operación', 950, 5, 10, null],
  ];
  return rows.map(([kind, concept, category, amount, monthsAgo, dayOfMonth, contact]) => ({
    id: crypto.randomUUID(),
    kind,
    concept,
    category,
    amount,
    date: day(monthsAgo, dayOfMonth),
    method: 'Transferencia',
    contact,
    notes: null,
    created_at: new Date().toISOString(),
  }));
}

function readDemoTransactions(): Transaction[] {
  const stored = readDemoValue<Transaction[] | null>(DEMO_KEY, null);
  if (stored) return stored;

  // Conserva los movimientos que se agregaron con el formato demo anterior.
  const legacy = readDemoValue<LegacyTransaction[]>(LEGACY_KEY, []).filter((item) => item.id.startsWith('MOV-'));
  const migrated: Transaction[] = legacy.map((item) => {
    const kind: TransactionKind = item.type === 'gasto' ? 'gasto' : 'ingreso';
    const category = legacyCategories[item.category] ?? item.category;
    return {
      id: crypto.randomUUID(),
      kind,
      concept: item.title,
      category: categoriesFor(kind).includes(category) ? category : categoriesFor(kind).at(-1)!,
      amount: Number(item.amount) || 0,
      date: item.date,
      method: 'Otro',
      contact: null,
      notes: null,
      created_at: new Date().toISOString(),
    };
  });
  const seeded = [...migrated, ...demoSeed()];
  writeDemoValue(DEMO_KEY, seeded);
  return seeded;
}

function sortTransactions(items: Transaction[]) {
  return [...items].sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
}

function fail(action: string, error: { message: string; code?: string }): never {
  if (error.code === '42501' || /row-level security/i.test(error.message)) {
    throw new Error(`No tienes permiso para ${action}.`);
  }
  if (error.code === '42P01' || /does not exist/i.test(error.message)) {
    throw new Error('La tabla no existe en Supabase. Ejecuta supabase-schema.sql en el SQL Editor.');
  }
  throw new Error(`No se pudo ${action}: ${error.message}`);
}

export async function listTransactions(supabase: SupabaseClient | null): Promise<Transaction[]> {
  if (!supabase) return sortTransactions(readDemoTransactions());

  const { data, error } = await supabase
    .from('transactions')
    .select(SELECT_COLUMNS)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) fail('cargar los movimientos', error);
  // numeric llega como string desde PostgREST en algunos casos.
  return (data as Transaction[]).map((item) => ({ ...item, amount: Number(item.amount) }));
}

export async function createTransaction(supabase: SupabaseClient | null, payload: TransactionPayload): Promise<Transaction> {
  if (!supabase) {
    const item: Transaction = { id: crypto.randomUUID(), ...payload, created_at: new Date().toISOString() };
    writeDemoValue(DEMO_KEY, [item, ...readDemoTransactions()]);
    return item;
  }

  const { data, error } = await supabase.from('transactions').insert(payload).select(SELECT_COLUMNS).single();
  if (error) fail('registrar el movimiento', error);
  return { ...(data as Transaction), amount: Number((data as Transaction).amount) };
}

export async function updateTransaction(supabase: SupabaseClient | null, id: string, payload: TransactionPayload): Promise<Transaction> {
  if (!supabase) {
    const current = readDemoTransactions();
    const existing = current.find((item) => item.id === id);
    if (!existing) throw new Error('El movimiento ya no existe.');
    const updated: Transaction = { ...existing, ...payload, updated_at: new Date().toISOString() };
    writeDemoValue(DEMO_KEY, current.map((item) => (item.id === id ? updated : item)));
    return updated;
  }

  const { data, error } = await supabase.from('transactions').update(payload).eq('id', id).select(SELECT_COLUMNS).single();
  if (error) fail('actualizar el movimiento', error);
  return { ...(data as Transaction), amount: Number((data as Transaction).amount) };
}

export async function deleteTransaction(supabase: SupabaseClient | null, id: string): Promise<void> {
  if (!supabase) {
    writeDemoValue(DEMO_KEY, readDemoTransactions().filter((item) => item.id !== id));
    return;
  }

  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) fail('eliminar el movimiento', error);
}

export { sortTransactions };
