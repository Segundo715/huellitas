import type { MetadataRoute } from 'next';
import { listPublicAnimalSummaries } from '@/lib/server/public-animals';
import { getSiteUrl } from '@/lib/site';

// Se regenera cada hora para incluir a los animales recién publicados.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const animals = await listPublicAnimalSummaries();
  return [
    { url: new URL('/adopta', site).toString(), changeFrequency: 'daily', priority: 1 },
    ...animals.map((animal) => ({
      url: new URL(`/adopta/${animal.id}`, site).toString(),
      lastModified: animal.created_at ? new Date(animal.created_at) : undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
