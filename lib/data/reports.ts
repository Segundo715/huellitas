import { z } from 'zod';
import { createTableStore } from '@/lib/data/table-store';

export const REPORT_TYPES = ['Maltrato', 'Animal abandonado', 'Herido', 'Extraviado', 'Otro'] as const;
export const REPORT_PRIORITIES = ['Alta', 'Media', 'Baja'] as const;
export const REPORT_STATUSES = ['Pendiente', 'Aprobado', 'Rechazado', 'Atendido'] as const;

export type CitizenReport = {
  id: string;
  type: string;
  priority: string;
  status: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  reporter_name: string | null;
  reporter_contact: string | null;
  assignee: string | null;
  resolution_notes: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
};

const nullable = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((value) => value || null);

const coordinate = (limit: number) =>
  z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : Number(value)))
    .refine((value) => value === null || (Number.isFinite(value) && Math.abs(value) <= limit), 'Coordenada no válida.');

export const reportFormSchema = z
  .object({
    type: z.enum(REPORT_TYPES),
    priority: z.enum(REPORT_PRIORITIES),
    description: z.string().trim().min(5, 'Describe lo que pasa (mínimo 5 caracteres).').max(2000, 'Máximo 2000 caracteres.'),
    address: nullable(240),
    latitude: coordinate(90),
    longitude: coordinate(180),
    reporter_name: nullable(120),
    reporter_contact: nullable(120),
  })
  .refine((value) => value.address || (value.latitude !== null && value.longitude !== null), { path: ['address'], message: 'Indica una dirección o usa tu ubicación.' });

export type ReportFormValues = z.input<typeof reportFormSchema>;
export type ReportPayload = z.output<typeof reportFormSchema>;
export type ReportUpdate = Partial<ReportPayload> & { status?: string; assignee?: string | null; resolution_notes?: string | null };

export const emptyReportForm = (): ReportFormValues => ({
  type: 'Maltrato',
  priority: 'Media',
  description: '',
  address: '',
  latitude: '',
  longitude: '',
  reporter_name: '',
  reporter_contact: '',
});

export function reportPriorityVariant(priority: string) {
  return priority === 'Alta' ? ('danger' as const) : priority === 'Media' ? ('warning' as const) : ('neutral' as const);
}

export function reportStatusVariant(status: string) {
  switch (status) {
    case 'Atendido':
      return 'success' as const;
    case 'Aprobado':
      return 'info' as const;
    case 'Rechazado':
      return 'neutral' as const;
    default:
      return 'warning' as const;
  }
}

export const isOpenReport = (report: CitizenReport) => report.status === 'Pendiente' || report.status === 'Aprobado';

export function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Ayer';
  if (days < 30) return `Hace ${days} días`;
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function mapLinks(report: Pick<CitizenReport, 'latitude' | 'longitude' | 'address'>) {
  if (report.latitude != null && report.longitude != null) {
    const { latitude: lat, longitude: lng } = report;
    const d = 0.004;
    return {
      embed: `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`,
      open: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    };
  }
  return report.address ? { embed: null, open: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(report.address)}` } : null;
}

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

export const reportStore = createTableStore<CitizenReport, ReportUpdate>({
  table: 'citizen_reports',
  label: 'el reporte',
  columns: 'id,type,priority,status,description,address,latitude,longitude,reporter_name,reporter_contact,assignee,resolution_notes,created_by,created_at,updated_at',
  demoKey: 'huellitas-demo-reports-v2',
  order: [{ column: 'created_at', ascending: false }],
  demoSeed: () => [
    { id: 'demo-rep-1', type: 'Maltrato', priority: 'Alta', status: 'Pendiente', description: 'Perro amarrado todo el día en una azotea, sin agua ni sombra. Se escucha llorar desde la mañana.', address: 'Calle Hidalgo 120, Centro', latitude: 19.4326, longitude: -99.1332, reporter_name: 'Vecina (anónimo)', reporter_contact: null, assignee: null, resolution_notes: null, created_at: hoursAgo(2) },
    { id: 'demo-rep-2', type: 'Animal abandonado', priority: 'Media', status: 'Aprobado', description: 'Gata con cuatro crías en un lote baldío detrás del mercado.', address: 'Av. Juárez y 5 de Mayo', latitude: null, longitude: null, reporter_name: 'Jorge P.', reporter_contact: '55 4321 8765', assignee: 'Luis', resolution_notes: 'Visita programada para mañana con transportadoras.', created_at: hoursAgo(26) },
    { id: 'demo-rep-3', type: 'Herido', priority: 'Alta', status: 'Atendido', description: 'Perro atropellado en la lateral, no puede caminar.', address: 'Periférico Sur km 3', latitude: 19.3007, longitude: -99.1846, reporter_name: 'Conductor', reporter_contact: null, assignee: 'Ana', resolution_notes: 'Trasladado a la Clínica San Roque. Fractura en pata trasera, estable.', created_at: hoursAgo(70) },
    { id: 'demo-rep-4', type: 'Extraviado', priority: 'Baja', status: 'Pendiente', description: 'Beagle con collar rojo deambulando por el parque, parece perdido.', address: 'Parque de los Venados', latitude: null, longitude: null, reporter_name: null, reporter_contact: 'parque@ejemplo.com', assignee: null, resolution_notes: null, created_at: hoursAgo(5) },
  ],
});
