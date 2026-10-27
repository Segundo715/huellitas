import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import { animals as demoAnimals } from '@/lib/mock-data';
import { getSupabasePublicConfig, isDemoMode } from '@/lib/supabase/config';

// Datos mínimos de un animal publicado, leídos en el servidor para metadatos y sitemap.
// Nunca incluye notas internas ni ubicación.
export type PublicAnimalSummary = {
  id: string;
  name: string;
  type: string;
  breed: string;
  age_years: number;
  sex: string;
  status: string;
  photo_webp: string | null;
  public_description: string | null;
  created_at: string | null;
};

const PUBLIC_STATUSES = ['Disponible', 'Reservado'];

// Cliente anónimo sin cookies: solo puede llamar a las funciones públicas.
function anonClient() {
  const config = getSupabasePublicConfig();
  if (!config) return null;
  return createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const listPublicAnimalSummaries = cache(async (): Promise<PublicAnimalSummary[]> => {
  if (isDemoMode()) {
    return demoAnimals
      .filter((animal) => PUBLIC_STATUSES.includes(animal.status))
      .map((animal) => ({
        id: animal.id,
        name: animal.name,
        type: animal.type,
        breed: animal.breed,
        age_years: animal.age_years,
        sex: animal.sex,
        status: animal.status,
        photo_webp: animal.photo_webp ?? null,
        public_description: animal.public_description ?? null,
        created_at: null,
      }));
  }

  const supabase = anonClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('list_adoptable_animals');
  // Los metadatos no deben tumbar la página: si falla, se usan los genéricos.
  if (error || !Array.isArray(data)) return [];
  return data as PublicAnimalSummary[];
});

export async function getPublicAnimalSummary(id: string): Promise<PublicAnimalSummary | null> {
  const animals = await listPublicAnimalSummaries();
  return animals.find((animal) => animal.id === id) ?? null;
}
