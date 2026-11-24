import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { demoUsers } from '@/lib/auth-demo';
import type { AppRole } from '@/lib/auth/roles';
import { readDemoValue, writeDemoValue } from '@/lib/demo-storage';
import { createTableStore } from '@/lib/data/table-store';

export const PROFILE_STATUSES = ['Activo', 'Invitación pendiente', 'Inactivo'] as const;

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_path: string | null;
  role: AppRole | null;
  team: string | null;
  location: string | null;
  status: string;
  created_at?: string;
};

const nullable = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((value) => value || null);

export const profileFormSchema = z.object({
  full_name: nullable(120),
  team: nullable(80),
  location: nullable(80),
  status: z.enum(PROFILE_STATUSES),
});

export type ProfileFormValues = z.input<typeof profileFormSchema>;
export type ProfilePayload = z.output<typeof profileFormSchema>;

const DEMO_KEY = 'huellitas-demo-profiles-v2';

const demoSeed = (): Profile[] => [
  ...Object.entries(demoUsers).map(([email, user], index) => ({
    id: email,
    email,
    full_name: user.name,
    avatar_path: null,
    role: user.role,
    team: ['Dirección', 'Cuidado animal', 'Voluntariado'][index] ?? null,
    location: ['CDMX', 'Azcapotzalco', 'Roma Norte'][index] ?? null,
    status: 'Activo',
  })),
  { id: 'diego@huellitas.org', email: 'diego@huellitas.org', full_name: 'Diego Navarro', avatar_path: null, role: 'operador', team: 'Adopciones', location: 'Tlalpan', status: 'Activo' },
  { id: 'sofia@huellitas.org', email: 'sofia@huellitas.org', full_name: 'Sofía Méndez', avatar_path: null, role: null, team: null, location: null, status: 'Invitación pendiente' },
];

export const profileStore = createTableStore<Profile, ProfilePayload>({
  table: 'staff_profiles',
  label: 'el perfil',
  columns: 'id,email,full_name,avatar_path,role,team,location,status,created_at',
  demoKey: DEMO_KEY,
  order: [{ column: 'created_at', ascending: true }],
  demoSeed,
});

/** Cambia el rol en app_metadata (lo que de verdad usa la app) mediante la función SQL set_user_role. */
export async function setUserRole(supabase: SupabaseClient | null, profile: Profile, role: AppRole): Promise<Profile> {
  if (!supabase) {
    const rows = readDemoValue<Profile[]>(DEMO_KEY, demoSeed());
    const updated = { ...profile, role, status: profile.status === 'Invitación pendiente' ? 'Activo' : profile.status };
    writeDemoValue(DEMO_KEY, rows.map((row) => (row.id === profile.id ? updated : row)));
    return updated;
  }

  const { error } = await supabase.rpc('set_user_role', { target_email: profile.email, new_role: role });
  if (error) {
    if (error.code === '42501') throw new Error('Solo la administración puede cambiar roles.');
    if (error.code === 'PGRST202') throw new Error('Falta la función set_user_role. Ejecuta supabase-schema.sql en el SQL Editor.');
    throw new Error(`No se pudo cambiar el rol: ${error.message}`);
  }
  // El trigger de auth.users ya sincronizó staff_profiles.role.
  return { ...profile, role };
}

export function roleBadge(role: AppRole | null) {
  switch (role) {
    case 'admin':
      return { label: 'Administración', className: 'border-violet-200 bg-violet-50 text-violet-700' };
    case 'operador':
      return { label: 'Operador', className: 'border-sky-200 bg-sky-50 text-sky-700' };
    case 'moderador':
      return { label: 'Moderador', className: 'border-rose-200 bg-rose-50 text-rose-700' };
    case 'voluntario':
      return { label: 'Voluntario', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
    default:
      return { label: 'Sin rol', className: 'border-amber-200 bg-amber-50 text-amber-800' };
  }
}
