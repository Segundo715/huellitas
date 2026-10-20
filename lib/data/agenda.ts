import { z } from 'zod';
import { addDaysIso, createTableStore, localTodayIso } from '@/lib/data/table-store';

export const AGENDA_TYPES = ['Cita', 'Salud', 'Evento', 'Tarea'] as const;
export const AGENDA_STATUSES = ['Programada', 'Confirmada', 'Pendiente', 'Completada', 'Cancelada'] as const;

export type AgendaEntry = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  type: string;
  assignee: string | null;
  status: string;
  animal_id: string | null;
  notes: string | null;
  created_by?: string | null;
  created_at?: string;
};

const nullable = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => value || null);

export const agendaFormSchema = z.object({
  title: z.string().trim().min(1, 'Escribe el asunto.').max(160, 'Máximo 160 caracteres.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige una fecha.'),
  time: z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d{2}:\d{2}/.test(value), 'Hora no válida.')
    .transform((value) => value || null),
  type: z.enum(AGENDA_TYPES),
  assignee: nullable(80, 'Máximo 80 caracteres.'),
  status: z.enum(AGENDA_STATUSES),
  animal_id: z.string().transform((value) => value || null),
  notes: nullable(1000, 'Máximo 1000 caracteres.'),
});

export type AgendaFormValues = z.input<typeof agendaFormSchema>;
export type AgendaPayload = z.output<typeof agendaFormSchema>;

export const emptyAgendaForm = (): AgendaFormValues => ({
  title: '',
  date: localTodayIso(),
  time: '',
  type: 'Cita',
  assignee: '',
  status: 'Programada',
  animal_id: '',
  notes: '',
});

export function agendaToForm(entry: AgendaEntry): AgendaFormValues {
  const pick = <T extends readonly string[]>(options: T, value: string, fallback: T[number]) =>
    (options as readonly string[]).includes(value) ? (value as T[number]) : fallback;
  return {
    title: entry.title,
    date: entry.date,
    time: entry.time?.slice(0, 5) ?? '',
    type: pick(AGENDA_TYPES, entry.type, 'Cita'),
    assignee: entry.assignee ?? '',
    status: pick(AGENDA_STATUSES, entry.status, 'Programada'),
    animal_id: entry.animal_id ?? '',
    notes: entry.notes ?? '',
  };
}

export function agendaTypeStyle(type: string) {
  switch (type) {
    case 'Salud':
      return { badge: 'danger' as const, dot: 'bg-rose-500', tile: 'bg-rose-50 text-rose-700' };
    case 'Evento':
      return { badge: 'info' as const, dot: 'bg-sky-500', tile: 'bg-sky-50 text-sky-700' };
    case 'Tarea':
      return { badge: 'warning' as const, dot: 'bg-amber-500', tile: 'bg-amber-50 text-amber-800' };
    default:
      return { badge: 'success' as const, dot: 'bg-emerald-500', tile: 'bg-emerald-50 text-emerald-700' };
  }
}

export const isClosedEntry = (entry: AgendaEntry) => entry.status === 'Completada' || entry.status === 'Cancelada';

export const sortAgenda = (entries: AgendaEntry[]) =>
  [...entries].sort((a, b) => `${a.date} ${a.time ?? '99'}`.localeCompare(`${b.date} ${b.time ?? '99'}`));

export const agendaStore = createTableStore<AgendaEntry, AgendaPayload>({
  table: 'calendar_entries',
  label: 'la cita',
  columns: 'id,title,date,time,type,assignee,status,animal_id,notes,created_by,created_at',
  demoKey: 'huellitas-demo-agenda-v2',
  order: [
    { column: 'date', ascending: true },
    { column: 'time', ascending: true },
  ],
  demoSeed: () => [
    { id: 'demo-ag-1', title: 'Cita de adopción de Luna', date: addDaysIso(0), time: '10:00', type: 'Cita', assignee: 'Ana', status: 'Confirmada', animal_id: 'luna', notes: 'Familia Ramírez, segunda visita.' },
    { id: 'demo-ag-2', title: 'Visita veterinaria: control de piel', date: addDaysIso(0), time: '13:30', type: 'Salud', assignee: 'Luis', status: 'Programada', animal_id: 'milo', notes: null },
    { id: 'demo-ag-3', title: 'Revisión de inventario mensual', date: addDaysIso(1), time: '09:00', type: 'Tarea', assignee: 'Luis', status: 'Pendiente', animal_id: null, notes: null },
    { id: 'demo-ag-4', title: 'Vacuna de refuerzo para Miel', date: addDaysIso(2), time: '11:15', type: 'Salud', assignee: 'Clínica San Roque', status: 'Programada', animal_id: 'miel', notes: null },
    { id: 'demo-ag-5', title: 'Taller de adopción responsable', date: addDaysIso(4), time: '18:00', type: 'Evento', assignee: 'Paula', status: 'Confirmada', animal_id: null, notes: 'Centro comunitario.' },
    { id: 'demo-ag-6', title: 'Entrevista con adoptante de Toby', date: addDaysIso(-2), time: '16:00', type: 'Cita', assignee: 'Ana', status: 'Completada', animal_id: 'toby', notes: null },
  ],
});
