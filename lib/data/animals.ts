import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { readDemoValue, writeDemoValue } from '@/lib/demo-storage';
import { animals as seedAnimals } from '@/lib/mock-data';

export const ANIMAL_TYPES = ['Perro', 'Gato', 'Otro'] as const;
export const ANIMAL_STATUSES = ['Disponible', 'En tratamiento', 'Reservado', 'Adoptado'] as const;
export const ANIMAL_SEXES = ['No especificado', 'Hembra', 'Macho'] as const;

export type Animal = {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  age_years: number;
  status: string;
  weight_kg: number | null;
  sex: string | null;
  location: string | null;
  notes: string | null;
  photo_webp: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AnimalNote = {
  id: string;
  animal_id: string;
  body: string;
  author_email: string | null;
  created_at: string;
};

const optionalText = z
  .string()
  .trim()
  .max(500)
  .transform((value) => value || null);

const optionalNumber = (max: number, message: string) =>
  z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : Number(value)))
    .refine((value) => value === null || (Number.isFinite(value) && value >= 0 && value <= max), message);

// Valida los datos del formulario (strings) y los convierte al formato de la tabla.
export const animalFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(80, 'Máximo 80 caracteres.'),
  type: z.enum(ANIMAL_TYPES),
  breed: optionalText,
  age_years: z
    .string()
    .trim()
    .transform((value) => Number(value || 0))
    .refine((value) => Number.isFinite(value) && value >= 0 && value <= 40, 'Edad entre 0 y 40 años.'),
  status: z.enum(ANIMAL_STATUSES),
  weight_kg: optionalNumber(200, 'Peso entre 0 y 200 kg.'),
  sex: z.enum(ANIMAL_SEXES),
  location: optionalText,
  notes: z
    .string()
    .trim()
    .max(2000, 'Máximo 2000 caracteres.')
    .transform((value) => value || null),
  photo_webp: z.string().transform((value) => value || null),
});

export type AnimalFormValues = z.input<typeof animalFormSchema>;
export type AnimalPayload = z.output<typeof animalFormSchema>;

export const emptyAnimalForm: AnimalFormValues = {
  name: '',
  type: 'Perro',
  breed: '',
  age_years: '1',
  status: 'Disponible',
  weight_kg: '',
  sex: 'No especificado',
  location: 'Área A / Sala 1',
  notes: '',
  photo_webp: '',
};

export function animalToForm(animal: Animal): AnimalFormValues {
  const pick = <T extends readonly string[]>(options: T, value: string | null, fallback: T[number]) =>
    (options as readonly string[]).includes(value ?? '') ? (value as T[number]) : fallback;

  return {
    name: animal.name,
    type: pick(ANIMAL_TYPES, animal.type, 'Otro'),
    breed: animal.breed ?? '',
    age_years: String(animal.age_years ?? 0),
    status: pick(ANIMAL_STATUSES, animal.status, 'Disponible'),
    weight_kg: animal.weight_kg == null ? '' : String(animal.weight_kg),
    sex: pick(ANIMAL_SEXES, animal.sex, 'No especificado'),
    location: animal.location ?? '',
    notes: animal.notes ?? '',
    photo_webp: animal.photo_webp ?? '',
  };
}

const DEMO_ANIMALS_KEY = 'huellitas-demo-animals-v2';
const DEMO_NOTES_KEY = 'huellitas-demo-animal-notes-v2';
const LEGACY_NOTES_KEY = 'huellitas-demo-animal-notes';

const SELECT_COLUMNS = 'id,name,type,breed,age_years,status,weight_kg,sex,location,notes,photo_webp,created_at,updated_at';

function readDemoAnimals(): Animal[] {
  return readDemoValue<Animal[]>(DEMO_ANIMALS_KEY, seedAnimals as unknown as Animal[]);
}

function readDemoNotes(): AnimalNote[] {
  const notes = readDemoValue<AnimalNote[] | null>(DEMO_NOTES_KEY, null);
  if (notes) return notes;

  // Migra las notas del formato demo anterior ({ [animalId]: [{ id, date, text }] }).
  const legacy = readDemoValue<Record<string, Array<{ id: number; text: string }>>>(LEGACY_NOTES_KEY, {});
  return Object.entries(legacy).flatMap(([animalId, items]) =>
    items.map((item) => ({
      id: String(item.id),
      animal_id: animalId,
      body: item.text,
      author_email: null,
      created_at: new Date(item.id).toISOString(),
    })),
  );
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

export async function listAnimals(supabase: SupabaseClient | null): Promise<Animal[]> {
  if (!supabase) return readDemoAnimals();

  const { data, error } = await supabase.from('animals').select(SELECT_COLUMNS).order('created_at', { ascending: false });
  if (error) fail('cargar los animales', error);
  return data as Animal[];
}

export async function getAnimal(supabase: SupabaseClient | null, id: string): Promise<Animal | null> {
  if (!supabase) return readDemoAnimals().find((animal) => animal.id === id) ?? null;

  const { data, error } = await supabase.from('animals').select(SELECT_COLUMNS).eq('id', id).maybeSingle();
  // Un id que no es UUID no existe: lo tratamos como "no encontrado".
  if (error?.code === '22P02') return null;
  if (error) fail('cargar el expediente', error);
  return data as Animal | null;
}

export async function createAnimal(supabase: SupabaseClient | null, payload: AnimalPayload): Promise<Animal> {
  if (!supabase) {
    const animal: Animal = { id: crypto.randomUUID(), ...payload, created_at: new Date().toISOString() };
    writeDemoValue(DEMO_ANIMALS_KEY, [animal, ...readDemoAnimals()]);
    return animal;
  }

  const { data, error } = await supabase.from('animals').insert(payload).select(SELECT_COLUMNS).single();
  if (error) fail('crear el expediente', error);
  return data as Animal;
}

export async function updateAnimal(supabase: SupabaseClient | null, id: string, payload: AnimalPayload): Promise<Animal> {
  if (!supabase) {
    const current = readDemoAnimals();
    const existing = current.find((animal) => animal.id === id);
    if (!existing) throw new Error('El expediente ya no existe.');
    const updated: Animal = { ...existing, ...payload, updated_at: new Date().toISOString() };
    writeDemoValue(DEMO_ANIMALS_KEY, current.map((animal) => (animal.id === id ? updated : animal)));
    return updated;
  }

  const { data, error } = await supabase.from('animals').update(payload).eq('id', id).select(SELECT_COLUMNS).single();
  if (error) fail('actualizar el expediente', error);
  return data as Animal;
}

export async function setAnimalStatus(supabase: SupabaseClient | null, id: string, status: (typeof ANIMAL_STATUSES)[number]): Promise<void> {
  if (!supabase) {
    const now = new Date().toISOString();
    writeDemoValue(DEMO_ANIMALS_KEY, readDemoAnimals().map((animal) => (animal.id === id ? { ...animal, status, updated_at: now } : animal)));
    return;
  }

  const { error } = await supabase.from('animals').update({ status }).eq('id', id);
  if (error) fail('actualizar el estado del animal', error);
}

export async function deleteAnimal(supabase: SupabaseClient | null, id: string): Promise<void> {
  if (!supabase) {
    writeDemoValue(DEMO_ANIMALS_KEY, readDemoAnimals().filter((animal) => animal.id !== id));
    writeDemoValue(DEMO_NOTES_KEY, readDemoNotes().filter((note) => note.animal_id !== id));
    return;
  }

  const { error } = await supabase.from('animals').delete().eq('id', id);
  if (error) fail('eliminar el expediente', error);
}

export async function listAnimalNotes(supabase: SupabaseClient | null, animalId: string): Promise<AnimalNote[]> {
  if (!supabase) {
    return readDemoNotes()
      .filter((note) => note.animal_id === animalId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const { data, error } = await supabase
    .from('animal_notes')
    .select('id,animal_id,body,author_email,created_at')
    .eq('animal_id', animalId)
    .order('created_at', { ascending: false });
  if (error) fail('cargar el historial', error);
  return data as AnimalNote[];
}

export async function addAnimalNote(supabase: SupabaseClient | null, animalId: string, body: string, authorEmail: string | null): Promise<AnimalNote> {
  const text = body.trim();
  if (!text) throw new Error('La nota no puede estar vacía.');
  if (text.length > 2000) throw new Error('La nota admite máximo 2000 caracteres.');

  if (!supabase) {
    const note: AnimalNote = { id: crypto.randomUUID(), animal_id: animalId, body: text, author_email: authorEmail, created_at: new Date().toISOString() };
    writeDemoValue(DEMO_NOTES_KEY, [note, ...readDemoNotes()]);
    return note;
  }

  // author_email lo rellena la base de datos a partir del JWT.
  const { data, error } = await supabase
    .from('animal_notes')
    .insert({ animal_id: animalId, body: text })
    .select('id,animal_id,body,author_email,created_at')
    .single();
  if (error) fail('guardar la nota', error);
  return data as AnimalNote;
}

export async function deleteAnimalNote(supabase: SupabaseClient | null, noteId: string): Promise<void> {
  if (!supabase) {
    writeDemoValue(DEMO_NOTES_KEY, readDemoNotes().filter((note) => note.id !== noteId));
    return;
  }

  const { error } = await supabase.from('animal_notes').delete().eq('id', noteId);
  if (error) fail('eliminar la nota', error);
}

export function animalStatusVariant(status: string) {
  switch (status) {
    case 'Disponible':
      return 'success' as const;
    case 'En tratamiento':
      return 'warning' as const;
    case 'Reservado':
      return 'info' as const;
    default:
      return 'neutral' as const;
  }
}
