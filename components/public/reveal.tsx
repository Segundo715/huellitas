'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatedNumber } from '@/components/animated-number';
import { cn } from '@/lib/utils';

/** true la primera vez que el elemento entra en pantalla. */
export function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, visible] as const;
}

/** Aparece con un desliz suave la primera vez que entra en pantalla. */
export function Reveal({
  children,
  className,
  delay = 0,
  variant = 'up',
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  variant?: 'up' | 'zoom' | 'left';
  as?: 'div' | 'li' | 'section';
}) {
  const [ref, visible] = useInView<HTMLElement>();
  return (
    <Tag
      ref={ref as never}
      className={cn('reveal', variant === 'zoom' && 'reveal-zoom', variant === 'left' && 'reveal-left', visible && 'is-visible', className)}
      style={{ ['--delay' as string]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/** Título de sección con subrayado que se dibuja al aparecer. */
export function RevealHeading({ children, className, center = false }: { children: React.ReactNode; className?: string; center?: boolean }) {
  return (
    <Reveal className={cn(center && 'text-center', className)}>
      <h2 className="inline-block font-display text-3xl font-extrabold tracking-tight">
        {children}
        <span aria-hidden="true" className="draw-line mt-1 block h-1.5 rounded-full bg-gradient-to-r from-primary via-violet-500 to-warm" />
      </h2>
    </Reveal>
  );
}

/** Número que cuenta desde 0 cuando entra en pantalla. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const [ref, visible] = useInView<HTMLSpanElement>();
  return (
    <span ref={ref} className={className}>
      <AnimatedNumber value={visible ? value : 0} duration={1600} />
    </span>
  );
}
