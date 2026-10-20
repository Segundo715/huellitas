import type { SupabaseClient } from '@supabase/supabase-js';
import { readDemoValue, writeDemoValue } from '@/lib/demo-storage';

type Row = { id: string };

// CRUD de una tabla de Supabase con respaldo en localStorage para el modo demo
// (cuando el cliente es null). Los mensajes de error ya vienen en español.
export function createTableStore<T extends Row, P extends object>({
  table,
  label,
  columns,
  demoKey,
  demoSeed,
  order,
}: {
  table: string;
  /** Cómo se nombra un registro en los mensajes, p. ej. «la cita». */
  label: string;
  columns: string;
  demoKey: string;
  demoSeed: () => T[];
  order: { column: string; ascending: boolean }[];
}) {
  const readDemo = () => readDemoValue<T[]>(demoKey, demoSeed());

  function fail(action: string, error: { message: string; code?: string }): never {
    if (error.code === '42501' || /row-level security|permission denied/i.test(error.message)) {
      throw new Error(`No tienes permiso para ${action}.`);
    }
    if (error.code === '42P01' || error.code === 'PGRST205' || /does not exist|could not find the table/i.test(error.message)) {
      throw new Error(`Falta la tabla ${table} en Supabase. Ejecuta supabase-schema.sql en el SQL Editor.`);
    }
    if (/fetch/i.test(error.message)) {
      throw new Error('No hay conexión con el servidor. Revisa tu internet.');
    }
    throw new Error(`No se pudo ${action}: ${error.message}`);
  }

  return {
    async list(supabase: SupabaseClient | null): Promise<T[]> {
      if (!supabase) {
        // Mismo orden que pediríamos a Supabase (los nulos van al final, como en Postgres).
        return [...readDemo()].sort((a, b) => {
          for (const { column, ascending } of order) {
            const x = (a as Record<string, unknown>)[column];
            const y = (b as Record<string, unknown>)[column];
            if (x === y) continue;
            if (x == null) return 1;
            if (y == null) return -1;
            const diff = String(x).localeCompare(String(y), undefined, { numeric: true });
            return ascending ? diff : -diff;
          }
          return 0;
        });
      }
      let query = supabase.from(table).select(columns);
      for (const { column, ascending } of order) query = query.order(column, { ascending });
      const { data, error } = await query;
      if (error) fail('cargar los datos', error);
      return data as unknown as T[];
    },

    async create(supabase: SupabaseClient | null, payload: P): Promise<T> {
      if (!supabase) {
        const row = { id: crypto.randomUUID(), ...payload, created_at: new Date().toISOString() } as unknown as T;
        writeDemoValue(demoKey, [row, ...readDemo()]);
        return row;
      }
      const { data, error } = await supabase.from(table).insert(payload as Record<string, unknown>).select(columns).single();
      if (error) fail(`guardar ${label}`, error);
      return data as unknown as T;
    },

    async update(supabase: SupabaseClient | null, id: string, payload: Partial<P>): Promise<T> {
      if (!supabase) {
        const rows = readDemo();
        const existing = rows.find((row) => row.id === id);
        if (!existing) throw new Error(`No se encontró ${label}; quizá alguien la borró.`);
        const updated = { ...existing, ...payload, updated_at: new Date().toISOString() } as T;
        writeDemoValue(demoKey, rows.map((row) => (row.id === id ? updated : row)));
        return updated;
      }
      const { data, error } = await supabase.from(table).update(payload as Record<string, unknown>).eq('id', id).select(columns).maybeSingle();
      if (error) fail(`actualizar ${label}`, error);
      // RLS no da error al editar algo ajeno: simplemente no devuelve la fila.
      if (!data) throw new Error(`No tienes permiso para editar ${label}.`);
      return data as unknown as T;
    },

    async remove(supabase: SupabaseClient | null, id: string): Promise<void> {
      if (!supabase) {
        writeDemoValue(demoKey, readDemo().filter((row) => row.id !== id));
        return;
      }
      const { data, error } = await supabase.from(table).delete().eq('id', id).select('id');
      if (error) fail(`eliminar ${label}`, error);
      if (!data?.length) throw new Error(`No tienes permiso para eliminar ${label}.`);
    },
  };
}

/** Errores de Zod → { campo: primer mensaje }. */
export function fieldErrors<K extends string>(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Partial<Record<K, string>> = {};
  for (const issue of issues) {
    const field = issue.path[0] as K;
    errors[field] ??= issue.message;
  }
  return errors;
}

export function localTodayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function formatDayLabel(iso: string) {
  const today = localTodayIso();
  if (iso === today) return 'Hoy';
  if (iso === addDaysIso(1)) return 'Mañana';
  if (iso === addDaysIso(-1)) return 'Ayer';
  const [y, m, d] = iso.split('-').map(Number);
  const text = new Date(y, m - 1, d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatShortDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "13:30:00" → "13:30" */
export function formatTime(time: string | null | undefined) {
  return time ? time.slice(0, 5) : '';
}
