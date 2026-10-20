import type { Metadata } from 'next';
import { AnimalProfile } from '@/components/public/animal-profile';

export const metadata: Metadata = {
  title: 'Perfil de adopción · Huellitas',
  description: 'Conoce su historia, su carácter y con quién convive. Envía tu solicitud de adopción en línea.',
};

export default async function AnimalAdoptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AnimalProfile id={id} />;
}
