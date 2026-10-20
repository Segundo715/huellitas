import { z } from 'zod';
import { addDaysIso, createTableStore, localTodayIso } from '@/lib/data/table-store';

export const EVENT_TYPES = ['Comunidad', 'Salud', 'Voluntariado', 'Fundraising', 'Adopción'] as const;

export type ShelterEvent = {
  id: string;
  title: string;
  type: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
  fundraising_goal: number | null;
  created_at?: string;
};

const nullable = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((value) => value || null);

const optionalTime = z
  .string()
  .trim()
  .transform((value) => value || null);

export const eventFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Ponle nombre al evento.').max(160, 'Máximo 160 caracteres.'),
    type: z.enum(EVENT_TYPES),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige una fecha.'),
    start_time: optionalTime,
    end_time: optionalTime,
    location: nullable(160),
    description: nullable(2000),
    fundraising_goal: z
      .string()
      .trim()
      .transform((value) => (value === '' ? null : Number(value.replace(',', '.'))))
      .refine((value) => value === null || (Number.isFinite(value) && value > 0), 'Meta mayor a 0.'),
  })
  .refine((value) => !value.start_time || !value.end_time || value.end_time > value.start_time, { path: ['end_time'], message: 'Debe terminar después de empezar.' });

export type EventFormValues = z.input<typeof eventFormSchema>;
export type EventPayload = z.output<typeof eventFormSchema>;

export const emptyEventForm = (): EventFormValues => ({
  title: '',
  type: 'Comunidad',
  event_date: addDaysIso(7),
  start_time: '10:00',
  end_time: '13:00',
  location: '',
  description: '',
  fundraising_goal: '',
});

export function eventToForm(event: ShelterEvent): EventFormValues {
  return {
    title: event.title,
    type: (EVENT_TYPES as readonly string[]).includes(event.type) ? (event.type as EventFormValues['type']) : 'Comunidad',
    event_date: event.event_date,
    start_time: event.start_time?.slice(0, 5) ?? '',
    end_time: event.end_time?.slice(0, 5) ?? '',
    location: event.location ?? '',
    description: event.description ?? '',
    fundraising_goal: event.fundraising_goal == null ? '' : String(event.fundraising_goal),
  };
}

export function eventTypeStyle(type: string) {
  switch (type) {
    case 'Salud':
      return { gradient: 'from-rose-400 to-orange-400', badge: 'danger' as const };
    case 'Voluntariado':
      return { gradient: 'from-emerald-400 to-teal-500', badge: 'success' as const };
    case 'Fundraising':
      return { gradient: 'from-amber-400 to-orange-500', badge: 'warning' as const };
    case 'Adopción':
      return { gradient: 'from-fuchsia-400 to-violet-500', badge: 'info' as const };
    default:
      return { gradient: 'from-sky-400 to-indigo-500', badge: 'info' as const };
  }
}

export function daysUntilEvent(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const [ty, tm, td] = localTodayIso().split('-').map(Number);
  return Math.round((new Date(y, m - 1, d).getTime() - new Date(ty, tm - 1, td).getTime()) / 86_400_000);
}

export const eventStore = createTableStore<ShelterEvent, EventPayload>({
  table: 'events',
  label: 'el evento',
  columns: 'id,title,type,event_date,start_time,end_time,location,description,fundraising_goal,created_at',
  demoKey: 'huellitas-demo-events-v2',
  order: [{ column: 'event_date', ascending: true }],
  demoSeed: () => [
    { id: 'demo-ev-1', title: 'Jornada de esterilización', type: 'Salud', event_date: addDaysIso(6), start_time: '09:00', end_time: '15:00', location: 'Refugio Huellitas', description: 'Esterilización a bajo costo para perros y gatos de la colonia. Cupo de 40 animales.', fundraising_goal: null },
    { id: 'demo-ev-2', title: 'Taller de adopción responsable', type: 'Comunidad', event_date: addDaysIso(11), start_time: '18:00', end_time: '20:00', location: 'Centro comunitario', description: 'Charla para familias interesadas en adoptar: costos, cuidados y adaptación.', fundraising_goal: null },
    { id: 'demo-ev-3', title: 'Paseo solidario', type: 'Fundraising', event_date: addDaysIso(19), start_time: '08:30', end_time: '12:00', location: 'Parque principal', description: 'Caminata con los perros del refugio. Inscripción con donativo.', fundraising_goal: 12000 },
    { id: 'demo-ev-4', title: 'Feria de adopción', type: 'Adopción', event_date: addDaysIso(26), start_time: '11:00', end_time: '17:00', location: 'Plaza central', description: 'Llevamos a los animales disponibles para que las familias los conozcan.', fundraising_goal: null },
    { id: 'demo-ev-5', title: 'Capacitación de voluntarios', type: 'Voluntariado', event_date: addDaysIso(-9), start_time: '10:00', end_time: '13:00', location: 'Refugio Huellitas', description: null, fundraising_goal: null },
  ],
});
