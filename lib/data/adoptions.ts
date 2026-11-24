import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { readDemoValue, writeDemoValue } from '@/lib/demo-storage';
import { adoptionLeads as seedLeads, animals as seedAnimals } from '@/lib/mock-data';

// Orden del pipeline. "Rechazada" queda fuera del flujo normal.
export const ADOPTION_STAGES = ['Nueva', 'Preselección', 'Entrevista', 'Documentación', 'Aprobada', 'Rechazada'] as const;
export const ACTIVE_STAGES = ['Nueva', 'Preselección', 'Entrevista', 'Documentación'] as const;
export const ADOPTION_PRIORITIES = ['Alta', 'Media', 'Baja'] as const;
export const ADOPTION_SOURCES = ['Web', 'Instagram', 'Facebook', 'Referido', 'Evento', 'Visita al refugio', 'Otro'] as const;
export const HOUSING_TYPES = ['Por confirmar', 'Casa con patio', 'Casa', 'Departamento', 'Otro'] as const;

export type AdoptionStage = (typeof ADOPTION_STAGES)[number];

export type AdoptionRequest = {
  id: string;
  applicant_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  animal_id: string | null;
  animal_name: string;
  stage: string;
  priority: string;
  source: string;
  housing: string;
  assignee: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((value) => value || null);

export const adoptionFormSchema = z.object({
  applicant_name: z.string().trim().min(1, 'El nombre es obligatorio.').max(120, 'Máximo 120 caracteres.'),
  email: z.string().trim().toLowerCase().email('Correo no válido.'),
  phone: optionalText(30),
  city: optionalText(120),
  animal_id: z.string().transform((value) => value || null),
  animal_name: z.string().trim().min(1, 'Elige o escribe el animal de interés.').max(80, 'Máximo 80 caracteres.'),
  stage: z.enum(ADOPTION_STAGES),
  priority: z.enum(ADOPTION_PRIORITIES),
  source: z.enum(ADOPTION_SOURCES),
  housing: z.enum(HOUSING_TYPES),
  assignee: optionalText(80),
  notes: optionalText(2000),
});

export type AdoptionFormValues = z.input<typeof adoptionFormSchema>;
export type AdoptionPayload = z.output<typeof adoptionFormSchema>;

export const emptyAdoptionForm: AdoptionFormValues = {
  applicant_name: '',
  email: '',
  phone: '',
  city: '',
  animal_id: '',
  animal_name: '',
  stage: 'Nueva',
  priority: 'Media',
  source: 'Web',
  housing: 'Por confirmar',
  assignee: '',
  notes: '',
};

function pick<T extends readonly string[]>(options: T, value: string | null | undefined, fallback: T[number]): T[number] {
  return (options as readonly string[]).includes(value ?? '') ? (value as T[number]) : fallback;
}

export function adoptionToForm(request: AdoptionRequest): AdoptionFormValues {
  return {
    applicant_name: request.applicant_name,
    email: request.email,
    phone: request.phone ?? '',
    city: request.city ?? '',
    animal_id: request.animal_id ?? '',
    animal_name: request.animal_name,
    stage: pick(ADOPTION_STAGES, request.stage, 'Nueva'),
    priority: pick(ADOPTION_PRIORITIES, request.priority, 'Media'),
    source: pick(ADOPTION_SOURCES, request.source, 'Otro'),
    housing: pick(HOUSING_TYPES, request.housing, 'Por confirmar'),
    assignee: request.assignee ?? '',
    notes: request.notes ?? '',
  };
}

export function nextStage(stage: string): AdoptionStage | null {
  const index = (ACTIVE_STAGES as readonly string[]).indexOf(stage);
  if (index === -1) return null;
  return index === ACTIVE_STAGES.length - 1 ? 'Aprobada' : ACTIVE_STAGES[index + 1];
}

export function isClosedStage(stage: string) {
  return stage === 'Aprobada' || stage === 'Rechazada';
}

export function adoptionStageVariant(stage: string) {
  switch (stage) {
    case 'Nueva':
      return 'warning' as const;
    case 'Preselección':
    case 'Entrevista':
    case 'Documentación':
      return 'info' as const;
    case 'Aprobada':
      return 'success' as const;
    case 'Rechazada':
      return 'danger' as const;
    default:
      return 'neutral' as const;
  }
}

export function adoptionPriorityVariant(priority: string) {
  switch (priority) {
    case 'Alta':
      return 'danger' as const;
    case 'Media':
      return 'warning' as const;
    default:
      return 'neutral' as const;
  }
}

// Días desde la última actualización: sirve para detectar solicitudes estancadas.
export function daysSinceUpdate(request: AdoptionRequest) {
  const reference = new Date(request.updated_at ?? request.created_at).getTime();
  return Math.max(0, Math.floor((Date.now() - reference) / 86_400_000));
}

export const STALE_AFTER_DAYS = 5;

const DEMO_KEY = 'huellitas-demo-adoptions-v2';
const LEGACY_KEY = 'huellitas-demo-adoption-leads';

const SELECT_COLUMNS = 'id,applicant_name,email,phone,city,animal_id,animal_name,stage,priority,source,housing,assignee,notes,created_at,updated_at';

type LegacyLead = (typeof seedLeads)[number];

const legacyStages: Record<string, AdoptionStage> = { Pendiente: 'Nueva', Aprobado: 'Aprobada', Rechazado: 'Rechazada' };

function fromLegacy(lead: LegacyLead, index: number): AdoptionRequest {
  // Fechas escalonadas para que el demo muestre solicitudes recientes y estancadas.
  const createdAt = new Date(Date.now() - (index + 1) * 2 * 86_400_000).toISOString();
  return {
    id: crypto.randomUUID(),
    applicant_name: lead.applicant,
    email: lead.email,
    phone: null,
    city: lead.city,
    animal_id: seedAnimals.find((animal) => animal.name === lead.animal)?.id ?? null,
    animal_name: lead.animal,
    stage: legacyStages[lead.status] ?? pick(ADOPTION_STAGES, lead.status, 'Nueva'),
    priority: pick(ADOPTION_PRIORITIES, lead.priority, 'Media'),
    source: pick(ADOPTION_SOURCES, lead.source, 'Otro'),
    housing: pick(HOUSING_TYPES, lead.home, 'Otro'),
    assignee: lead.assignee,
    notes: null,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

function readDemoRequests(): AdoptionRequest[] {
  const stored = readDemoValue<AdoptionRequest[] | null>(DEMO_KEY, null);
  if (stored) return stored;

  // Migra las solicitudes guardadas con el formato demo anterior.
  const legacy = readDemoValue<LegacyLead[]>(LEGACY_KEY, seedLeads);
  const migrated = legacy.map(fromLegacy);
  writeDemoValue(DEMO_KEY, migrated);
  return migrated;
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

export async function listAdoptions(supabase: SupabaseClient | null): Promise<AdoptionRequest[]> {
  if (!supabase) return readDemoRequests().sort((a, b) => b.created_at.localeCompare(a.created_at));

  const { data, error } = await supabase.from('shelter_adoption_requests').select(SELECT_COLUMNS).order('created_at', { ascending: false });
  if (error) fail('cargar las solicitudes', error);
  return data as AdoptionRequest[];
}

export async function createAdoption(supabase: SupabaseClient | null, payload: AdoptionPayload): Promise<AdoptionRequest> {
  if (!supabase) {
    const now = new Date().toISOString();
    const request: AdoptionRequest = { id: crypto.randomUUID(), ...payload, created_at: now, updated_at: now };
    writeDemoValue(DEMO_KEY, [request, ...readDemoRequests()]);
    return request;
  }

  const { data, error } = await supabase.from('shelter_adoption_requests').insert(payload).select(SELECT_COLUMNS).single();
  if (error) fail('crear la solicitud', error);
  return data as AdoptionRequest;
}

export async function updateAdoption(supabase: SupabaseClient | null, id: string, payload: Partial<AdoptionPayload>): Promise<AdoptionRequest> {
  if (!supabase) {
    const current = readDemoRequests();
    const existing = current.find((request) => request.id === id);
    if (!existing) throw new Error('La solicitud ya no existe.');
    const updated: AdoptionRequest = { ...existing, ...payload, updated_at: new Date().toISOString() };
    writeDemoValue(DEMO_KEY, current.map((request) => (request.id === id ? updated : request)));
    return updated;
  }

  const { data, error } = await supabase.from('shelter_adoption_requests').update(payload).eq('id', id).select(SELECT_COLUMNS).single();
  if (error) fail('actualizar la solicitud', error);
  return data as AdoptionRequest;
}

export async function deleteAdoption(supabase: SupabaseClient | null, id: string): Promise<void> {
  if (!supabase) {
    writeDemoValue(DEMO_KEY, readDemoRequests().filter((request) => request.id !== id));
    return;
  }

  const { error } = await supabase.from('shelter_adoption_requests').delete().eq('id', id);
  if (error) fail('eliminar la solicitud', error);
}
