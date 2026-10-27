import type { Metadata } from 'next';
import { AnimalProfile } from '@/components/public/animal-profile';
import { getPublicAnimalSummary } from '@/lib/server/public-animals';

type Props = { params: Promise<{ id: string }> };

const FALLBACK: Metadata = {
  title: 'Perfil de adopción',
  description: 'Conoce su historia, su carácter y con quién convive. Envía tu solicitud de adopción en línea.',
};

function shorten(text: string, max = 160) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

// Título, descripción y foto propios de cada animal: así se ve bien al compartir el enlace.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const animal = await getPublicAnimalSummary(id);
  if (!animal) return FALLBACK;

  const title = `Adopta a ${animal.name}`;
  const article = animal.sex === 'Hembra' ? 'una' : 'un';
  const kind = animal.type === 'Gato' ? 'gato' : animal.type === 'Perro' ? 'perro' : 'peludo';
  const description = shorten(
    animal.public_description || `${animal.name} es ${article} ${kind} ${animal.breed.toLowerCase()} que busca una familia. Conoce su historia y envía tu solicitud en línea.`,
  );
  const images = animal.photo_webp ? [{ url: animal.photo_webp, alt: `Foto de ${animal.name}` }] : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/adopta/${animal.id}` },
    openGraph: { type: 'article', title: `${title} · Huellitas`, description, images },
    twitter: { card: 'summary_large_image', title: `${title} · Huellitas`, description, images },
  };
}

export default async function AnimalAdoptionPage({ params }: Props) {
  const { id } = await params;
  return <AnimalProfile id={id} />;
}
