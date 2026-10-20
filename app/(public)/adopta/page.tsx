import type { Metadata } from 'next';
import { AdoptionCatalog } from '@/components/public/adoption-catalog';

export const metadata: Metadata = {
  title: 'Adopta un perro o gato · Huellitas',
  description: 'Perros y gatos rescatados, vacunados y esterilizados buscan una familia. Conócelos y envía tu solicitud de adopción en línea.',
  openGraph: {
    title: 'Adopta en Huellitas 🐾',
    description: 'Tu nuevo mejor amigo te está esperando. Conoce a los perros y gatos del refugio.',
    images: ['/fotos/animales/luna.webp'],
  },
};

export default function AdoptaPage() {
  return <AdoptionCatalog />;
}
