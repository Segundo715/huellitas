import { z } from 'zod';
import { createTableStore } from '@/lib/data/table-store';

export const CARE_STATUSES = ['Pendiente', 'Programada', 'En curso', 'Completada'] as const;
export const CARE_TASK_SUGGESTIONS = ['Vacuna anual', 'Refuerzo de vacuna', 'Desparasitación', 'Control de peso', 'Revisión veterinaria', 'Curación', 'Medicación', 'Baño y cepillado', 'Esterilización'] as const;

export type CareReminder = {
  id: string;
  animal_id: string | null;
  animal_name: string;
  task: string;
  due_at: string;
  status: string;
  notes: string | null;
  created_by?: string | null;
  created_at?: string;
};

export const careFormSchema = z.object({
  animal_id: z.string().transform((value) => value || null),
  animal_name: z.string().trim().min(1, 'Indica el animal.').max(80, 'Máximo 80 caracteres.'),
  task: z.string().trim().min(1, 'Describe el cuidado.').max(160, 'Máximo 160 caracteres.'),
  // datetime-local («2026-10-20T09:30») → ISO con la zona horaria del navegador.
  due_at: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Elige fecha y hora.')
    .transform((value) => new Date(value).toISOString()),
  status: z.enum(CARE_STATUSES),
  notes: z
    .string()
    .trim()
    .max(1000, 'Máximo 1000 caracteres.')
    .transform((value) => value || null),
});

export type CareFormValues = z.input<typeof careFormSchema>;
export type CarePayload = z.output<typeof careFormSchema>;

/** Date → valor para <input type="datetime-local"> en hora local. */
export function toLocalInput(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export const emptyCareForm = (): CareFormValues => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return { animal_id: '', animal_name: '', task: '', due_at: toLocalInput(tomorrow), status: 'Pendiente', notes: '' };
};

export function careToForm(reminder: CareReminder): CareFormValues {
  return {
    animal_id: reminder.animal_id ?? '',
    animal_name: reminder.animal_name,
    task: reminder.task,
    due_at: toLocalInput(new Date(reminder.due_at)),
    status: (CARE_STATUSES as readonly string[]).includes(reminder.status) ? (reminder.status as CareFormValues['status']) : 'Pendiente',
    notes: reminder.notes ?? '',
  };
}

export type CareUrgency = 'Vencido' | 'Hoy' | 'Próximo' | 'Completado';

export function careUrgency(reminder: CareReminder, now = new Date()): CareUrgency {
  if (reminder.status === 'Completada') return 'Completado';
  const due = new Date(reminder.due_at);
  if (due < now) return 'Vencido';
  if (due.toDateString() === now.toDateString()) return 'Hoy';
  return 'Próximo';
}

export function formatDue(iso: string) {
  const due = new Date(iso);
  const now = new Date();
  const time = due.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const days = Math.round((new Date(due.toDateString()).getTime() - new Date(now.toDateString()).getTime()) / 86_400_000);
  if (days === 0) return `Hoy, ${time}`;
  if (days === 1) return `Mañana, ${time}`;
  if (days === -1) return `Ayer, ${time}`;
  if (days < 0) return `Hace ${-days} días`;
  if (days < 7) return `${due.toLocaleDateString('es-MX', { weekday: 'long' })}, ${time}`;
  return due.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) + `, ${time}`;
}

const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

export const careStore = createTableStore<CareReminder, CarePayload>({
  table: 'care_reminders',
  label: 'el recordatorio',
  columns: 'id,animal_id,animal_name,task,due_at,status,notes,created_by,created_at',
  demoKey: 'huellitas-demo-care-v2',
  order: [{ column: 'due_at', ascending: true }],
  demoSeed: () => [
    { id: 'demo-care-1', animal_id: 'milo', animal_name: 'Milo', task: 'Control de piel', due_at: hoursFromNow(-20), status: 'Pendiente', notes: 'Revisar si la pomada está funcionando.' },
    { id: 'demo-care-2', animal_id: 'rocky', animal_name: 'Rocky', task: 'Medicación', due_at: hoursFromNow(3), status: 'En curso', notes: 'Antibiótico cada 12 horas, con comida.' },
    { id: 'demo-care-3', animal_id: 'miel', animal_name: 'Miel', task: 'Refuerzo de vacuna', due_at: hoursFromNow(26), status: 'Programada', notes: null },
    { id: 'demo-care-4', animal_id: 'mia', animal_name: 'Mía', task: 'Desparasitación', due_at: hoursFromNow(50), status: 'Pendiente', notes: 'Segunda dosis.' },
    { id: 'demo-care-5', animal_id: 'lola', animal_name: 'Lola', task: 'Control de peso', due_at: hoursFromNow(120), status: 'Programada', notes: null },
    { id: 'demo-care-6', animal_id: 'luna', animal_name: 'Luna', task: 'Vacuna anual', due_at: hoursFromNow(-72), status: 'Completada', notes: 'Aplicada sin reacciones.' },
  ],
});
