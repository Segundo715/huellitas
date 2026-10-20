import { z } from 'zod';
import { createTableStore } from '@/lib/data/table-store';

export const LISTING_PET_TYPES = ['Perro', 'Gato', 'Otro'] as const;
export const LISTING_STATUSES = ['Pendiente', 'Aprobada', 'Rechazada'] as const;

export type AdoptionListing = {
  id: string;
  owner_name: string;
  owner_email: string | null;
  owner_phone: string | null;
  pet_name: string;
  pet_type: string;
  location: string | null;
  motive: string;
  photo_webp: string | null;
  status: string;
  reviewed_at: string | null;
  created_at: string;
};

const nullable = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((value) => value || null);

export const listingFormSchema = z
  .object({
    owner_name: z.string().trim().min(1, 'Indica quién publica.').max(120, 'Máximo 120 caracteres.'),
    owner_email: z
      .string()
      .trim()
      .refine((value) => value === '' || z.email().safeParse(value).success, 'Correo no válido.')
      .transform((value) => value.toLowerCase() || null),
    owner_phone: nullable(30),
    pet_name: z.string().trim().min(1, 'Nombre de la mascota.').max(80, 'Máximo 80 caracteres.'),
    pet_type: z.enum(LISTING_PET_TYPES),
    location: nullable(120),
    motive: z.string().trim().min(5, 'Explica el motivo (mínimo 5 caracteres).').max(1000, 'Máximo 1000 caracteres.'),
    photo_webp: z.string().transform((value) => value || null),
  })
  .refine((value) => value.owner_email || value.owner_phone, { path: ['owner_phone'], message: 'Deja al menos un teléfono o un correo.' });

export type ListingFormValues = z.input<typeof listingFormSchema>;
export type ListingPayload = z.output<typeof listingFormSchema>;
export type ListingUpdate = Partial<ListingPayload> & { status?: string; reviewed_at?: string | null };

export const emptyListingForm: ListingFormValues = {
  owner_name: '',
  owner_email: '',
  owner_phone: '',
  pet_name: '',
  pet_type: 'Perro',
  location: '',
  motive: '',
  photo_webp: '',
};

export function listingToForm(listing: AdoptionListing): ListingFormValues {
  return {
    owner_name: listing.owner_name,
    owner_email: listing.owner_email ?? '',
    owner_phone: listing.owner_phone ?? '',
    pet_name: listing.pet_name,
    pet_type: (LISTING_PET_TYPES as readonly string[]).includes(listing.pet_type) ? (listing.pet_type as ListingFormValues['pet_type']) : 'Otro',
    location: listing.location ?? '',
    motive: listing.motive,
    photo_webp: listing.photo_webp ?? '',
  };
}

export function listingStatusVariant(status: string) {
  return status === 'Aprobada' ? ('success' as const) : status === 'Rechazada' ? ('danger' as const) : ('warning' as const);
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

export const listingStore = createTableStore<AdoptionListing, ListingUpdate>({
  table: 'adoption_listings',
  label: 'la publicación',
  columns: 'id,owner_name,owner_email,owner_phone,pet_name,pet_type,location,motive,photo_webp,status,reviewed_at,created_at',
  demoKey: 'huellitas-demo-listings-v2',
  order: [{ column: 'created_at', ascending: false }],
  demoSeed: () => [
    { id: 'demo-lis-1', owner_name: 'Nora Gutiérrez', owner_email: 'nora.g@ejemplo.com', owner_phone: '55 1122 3344', pet_name: 'Toby', pet_type: 'Perro', location: 'Coyoacán', motive: 'Nos mudamos a un departamento pequeño y Toby necesita espacio para correr. Está vacunado y esterilizado.', photo_webp: null, status: 'Pendiente', reviewed_at: null, created_at: daysAgo(1) },
    { id: 'demo-lis-2', owner_name: 'Rafael Ortiz', owner_email: null, owner_phone: '55 9988 7766', pet_name: 'Canela', pet_type: 'Perro', location: 'Roma Norte', motive: 'Me cambio de ciudad por trabajo y no puedo llevarla. Busco una familia responsable.', photo_webp: null, status: 'Aprobada', reviewed_at: daysAgo(2), created_at: daysAgo(4) },
    { id: 'demo-lis-3', owner_name: 'María López', owner_email: 'maria.lopez@ejemplo.com', owner_phone: null, pet_name: 'Michi', pet_type: 'Gato', location: 'Condesa', motive: 'Mi hijo desarrolló alergia. Michi es tranquila, ideal para una casa sin niños pequeños.', photo_webp: null, status: 'Pendiente', reviewed_at: null, created_at: daysAgo(3) },
  ],
});
