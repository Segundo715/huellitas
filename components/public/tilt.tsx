'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';

/** Inclina su contenido en 3D siguiendo el mouse. En pantallas táctiles o con «reducir movimiento» no hace nada. */
export function Tilt({ children, className, max = 8 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  const enabled = () =>
    typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node || !enabled()) return;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    node.style.transform = `perspective(900px) rotateX(${-y * max}deg) rotateY(${x * max}deg) translateY(-4px)`;
  };

  const reset = () => {
    if (ref.current) ref.current.style.transform = '';
  };

  return (
    <div ref={ref} onPointerMove={handleMove} onPointerLeave={reset} className={cn('h-full transition-transform duration-300 ease-out will-change-transform', className)}>
      {children}
    </div>
  );
}
