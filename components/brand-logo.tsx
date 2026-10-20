import Image from 'next/image';
import { cn } from '@/lib/utils';

// Logo oficial de Huellitas en formato circular.
// `full` incluye el nombre debajo de la huella (para tamaños grandes).
export function BrandLogo({ size = 40, full = false, className, priority }: { size?: number; full?: boolean; className?: string; priority?: boolean }) {
  return (
    <Image
      src={full ? '/logo-full.png' : '/logo.png'}
      alt="Huellitas"
      width={size}
      height={size}
      priority={priority}
      className={cn('shrink-0 rounded-full bg-white object-cover shadow-lg ring-2 ring-white/20', className)}
    />
  );
}
