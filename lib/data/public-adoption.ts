import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { createAdoption } from '@/lib/data/adoptions';
import { listAnimals, type Animal } from '@/lib/data/animals';

// Lo que ve cualquier visitante: nunca incluye notas internas, ubicación en el refugio ni historial.
export type PublicAnimal = Pick<
  Animal,
  | 'id'
  | 'name'
  | 'type'
  | 'breed'
  | 'age_years'
  | 'sex'
  | 'weight_kg'
  | 'status'
  | 'photo_webp'
  | 'public_description'
  | 'size'
  | 'energy'
  | 'vaccinated'
  | 'sterilized'
  | 'good_with_kids'
  | 'good_with_dogs'
  | 'good_with_cats'
  | 'created_at'
>;

export type ShelterStats = { available: number; adopted: number; rescued: number };

const PUBLIC_STATUSES = ['Disponible', 'Reservado'];

function toPublic(animal: Animal): PublicAnimal {
  const { id, name, type, breed, age_years, sex, weight_kg, status, photo_webp, public_description, size, energy, vaccinated, sterilized, good_with_kids, good_with_dogs, good_with_cats, created_at } = animal;
  return { id, name, type, breed, age_years, sex, weight_kg, status, photo_webp, public_description, size, energy, vaccinated, sterilized, good_with_kids, good_with_dogs, good_with_cats, created_at };
}

export async function listAdoptableAnimals(supabase: SupabaseClient | null): Promise<PublicAnimal[]> {
  if (!supabase) {
    return (await listAnimals(null))
      .filter((animal) => PUBLIC_STATUSES.includes(animal.status))
      .sort((a, b) => Number(b.status === 'Disponible') - Number(a.status === 'Disponible'))
      .map(toPublic);
  }
  const { data, error } = await supabase.rpc('list_adoptable_animals');
  if (error) {
    if (error.code === 'PGRST202') throw new Error('La página de adopción aún no está activada. Ejecuta supabase-schema.sql en Supabase.');
    throw new Error('No pudimos cargar a los animales. Intenta de nuevo en un momento.');
  }
  return data as PublicAnimal[];
}

export async function getShelterStats(supabase: SupabaseClient | null): Promise<ShelterStats | null> {
  if (!supabase) {
    const animals = await listAnimals(null);
    return { available: animals.filter((a) => a.status === 'Disponible').length, adopted: animals.filter((a) => a.status === 'Adoptado').length, rescued: animals.length };
  }
  const { data, error } = await supabase.rpc('shelter_public_stats');
  if (error || !data?.[0]) return null;
  return data[0] as ShelterStats;
}

export const PUBLIC_HOUSING = ['Departamento', 'Casa', 'Casa con patio', 'Otro'] as const;

export const publicRequestSchema = z.object({
  name: z.string().trim().min(2, 'Escribe tu nombre completo.').max(120, 'Máximo 120 caracteres.'),
  email: z.string().trim().toLowerCase().email('Escribe un correo válido.'),
  phone: z
    .string()
    .trim()
    .refine((value) => value.replace(/\D/g, '').length >= 8 && value.length <= 30, 'Escribe un teléfono de contacto.'),
  city: z.string().trim().max(120, 'Máximo 120 caracteres.'),
  housing: z.enum(PUBLIC_HOUSING, { message: 'Cuéntanos dónde vives.' }),
  message: z.string().trim().min(20, 'Cuéntanos un poco más (mínimo 20 caracteres).').max(2000, 'Máximo 2000 caracteres.'),
  accepted: z.literal(true, { message: 'Necesitamos tu confirmación para continuar.' }),
  // Campo trampa para bots: oculto a las personas.
  website: z.string(),
});

export type PublicRequestValues = Omit<z.input<typeof publicRequestSchema>, 'housing' | 'accepted'> & { housing: string; accepted: boolean };

export const emptyPublicRequest: PublicRequestValues = { name: '', email: '', phone: '', city: '', housing: '', message: '', accepted: false, website: '' };

export async function submitAdoptionRequest(supabase: SupabaseClient | null, animal: PublicAnimal, values: z.output<typeof publicRequestSchema>): Promise<void> {
  if (!supabase) {
    if (values.website) return;
    await createAdoption(null, {
      applicant_name: values.name,
      email: values.email,
      phone: values.phone,
      city: values.city || null,
      animal_id: animal.id,
      animal_name: animal.name,
      stage: 'Nueva',
      priority: 'Media',
      source: 'Web',
      housing: values.housing,
      assignee: null,
      notes: values.message,
    });
    return;
  }

  const { error } = await supabase.rpc('submit_adoption_request', {
    p_animal_id: animal.id,
    p_name: values.name,
    p_email: values.email,
    p_phone: values.phone,
    p_city: values.city,
    p_housing: values.housing,
    p_message: values.message,
    p_website: values.website,
  });
  if (error) {
    // Los mensajes de la función ya están escritos para el visitante.
    if (['22023', '23505', '54000', 'P0002'].includes(error.code ?? '')) throw new Error(error.message);
    if (/fetch/i.test(error.message)) throw new Error('No hay conexión. Revisa tu internet e intenta de nuevo.');
    throw new Error('No pudimos enviar tu solicitud. Intenta de nuevo en un momento.');
  }
}

export function ageLabel(years: number) {
  if (years < 1) {
    const months = Math.max(1, Math.round(years * 12));
    return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  }
  const whole = Math.floor(years);
  return `${whole} ${whole === 1 ? 'año' : 'años'}`;
}

export type AgeGroup = 'Cachorro' | 'Joven' | 'Adulto' | 'Senior';

export function ageGroup(animal: Pick<PublicAnimal, 'age_years' | 'type'>): AgeGroup {
  if (animal.age_years < 1) return 'Cachorro';
  if (animal.age_years < 3) return 'Joven';
  if (animal.age_years >= (animal.type === 'Gato' ? 10 : 8)) return 'Senior';
  return 'Adulto';
}

export function ageGroupLabel(group: AgeGroup, type: string) {
  if (group === 'Cachorro') return type === 'Gato' ? 'Gatito' : 'Cachorro';
  return group;
}

/** Rasgos positivos para mostrar como etiquetas. */
export function highlights(animal: PublicAnimal) {
  const list: string[] = [];
  if (animal.vaccinated) list.push('Vacunado');
  if (animal.sterilized) list.push('Esterilizado');
  if (animal.good_with_kids) list.push('Ama a los niños');
  if (animal.good_with_dogs) list.push('Amigable con perros');
  if (animal.good_with_cats) list.push('Amigable con gatos');
  return list;
}
