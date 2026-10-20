import { z } from 'zod';
import { addDaysIso, createTableStore } from '@/lib/data/table-store';

export const SHIFT_STATUSES = ['Programado', 'Cumplido', 'Ausente', 'Cancelado'] as const;

export type VolunteerTeam = {
  id: string;
  name: string;
  description: string | null;
  weekly_shifts_needed: number;
  created_at?: string;
};

export type VolunteerShift = {
  id: string;
  team_id: string;
  volunteer_name: string;
  date: string;
  start_time: string;
  end_time: string | null;
  status: string;
  notes: string | null;
  created_by?: string | null;
  created_at?: string;
};

const nullable = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((value) => value || null);

export const teamFormSchema = z.object({
  name: z.string().trim().min(1, 'Nombre del equipo.').max(80, 'Máximo 80 caracteres.'),
  description: nullable(500),
  weekly_shifts_needed: z
    .string()
    .trim()
    .transform((value) => Number(value || 0))
    .refine((value) => Number.isInteger(value) && value >= 0 && value <= 100, 'Entre 0 y 100 turnos.'),
});

export const shiftFormSchema = z
  .object({
    team_id: z.string().min(1, 'Elige un equipo.'),
    volunteer_name: z.string().trim().min(1, 'Quién cubre el turno.').max(120, 'Máximo 120 caracteres.'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige una fecha.'),
    start_time: z.string().regex(/^\d{2}:\d{2}/, 'Hora de inicio.'),
    end_time: z
      .string()
      .trim()
      .transform((value) => value || null),
    notes: nullable(500),
  })
  .refine((value) => !value.end_time || value.end_time > value.start_time, { path: ['end_time'], message: 'Debe terminar después de empezar.' });

export type TeamFormValues = z.input<typeof teamFormSchema>;
export type TeamPayload = z.output<typeof teamFormSchema>;
export type ShiftFormValues = z.input<typeof shiftFormSchema>;
export type ShiftPayload = z.output<typeof shiftFormSchema> & { status?: string };

export const emptyTeamForm: TeamFormValues = { name: '', description: '', weekly_shifts_needed: '5' };

export const emptyShiftForm = (teamId = '', volunteer = ''): ShiftFormValues => ({
  team_id: teamId,
  volunteer_name: volunteer,
  date: addDaysIso(1),
  start_time: '09:00',
  end_time: '13:00',
  notes: '',
});

/** Lunes y domingo (ISO) de la semana actual. */
export function currentWeek() {
  const now = new Date();
  const offset = (now.getDay() + 6) % 7;
  return { start: addDaysIso(-offset), end: addDaysIso(6 - offset) };
}

export function shiftStatusVariant(status: string) {
  switch (status) {
    case 'Cumplido':
      return 'success' as const;
    case 'Ausente':
      return 'danger' as const;
    case 'Cancelado':
      return 'neutral' as const;
    default:
      return 'info' as const;
  }
}

export const teamStore = createTableStore<VolunteerTeam, TeamPayload>({
  table: 'volunteer_teams',
  label: 'el equipo',
  columns: 'id,name,description,weekly_shifts_needed,created_at',
  demoKey: 'huellitas-demo-teams-v2',
  order: [{ column: 'name', ascending: true }],
  demoSeed: () => [
    { id: 'demo-team-1', name: 'Paseo y socialización', description: 'Paseos diarios y juego con los perros para que estén listos para su familia.', weekly_shifts_needed: 14 },
    { id: 'demo-team-2', name: 'Adopciones y entrevistas', description: 'Acompaña a las familias durante visitas y entrevistas.', weekly_shifts_needed: 6 },
    { id: 'demo-team-3', name: 'Cuidado veterinario', description: 'Apoyo en curaciones, baños y administración de medicamentos.', weekly_shifts_needed: 5 },
  ],
});

export const shiftStore = createTableStore<VolunteerShift, ShiftPayload>({
  table: 'volunteer_shifts',
  label: 'el turno',
  columns: 'id,team_id,volunteer_name,date,start_time,end_time,status,notes,created_by,created_at',
  demoKey: 'huellitas-demo-shifts-v2',
  order: [
    { column: 'date', ascending: true },
    { column: 'start_time', ascending: true },
  ],
  demoSeed: () => {
    const { start } = currentWeek();
    const day = (offset: number) => {
      const [y, m, d] = start.split('-').map(Number);
      const date = new Date(y, m - 1, d + offset);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };
    const rows: [string, string, number, string, string, string][] = [
      ['demo-team-1', 'Paula Ruiz', 0, '08:00', '10:00', 'Cumplido'],
      ['demo-team-1', 'Diego Navarro', 1, '17:00', '19:00', 'Cumplido'],
      ['demo-team-1', 'Paula Ruiz', 2, '08:00', '10:00', 'Programado'],
      ['demo-team-1', 'Sofía Méndez', 3, '17:30', '19:30', 'Programado'],
      ['demo-team-1', 'Marco Díaz', 5, '09:00', '12:00', 'Programado'],
      ['demo-team-2', 'Ana Morales', 2, '10:00', '13:00', 'Programado'],
      ['demo-team-2', 'Sofía Méndez', 4, '16:00', '18:00', 'Programado'],
      ['demo-team-3', 'Luis Ortega', 1, '09:00', '11:00', 'Ausente'],
      ['demo-team-3', 'Paula Ruiz', 4, '09:00', '11:00', 'Programado'],
    ];
    return rows.map(([team_id, volunteer_name, offset, start_time, end_time, status], index) => ({
      id: `demo-shift-${index + 1}`,
      team_id,
      volunteer_name,
      date: day(offset),
      start_time,
      end_time,
      status,
      notes: null,
    }));
  },
});
