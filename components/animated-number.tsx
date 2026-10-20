'use client';

import { useEffect, useRef, useState } from 'react';

// Cuenta desde el valor anterior hasta el nuevo con una curva suave.
export function AnimatedNumber({ value, format, duration = 900 }: { value: number; format?: (value: number) => string; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = fromRef.current;
    if (reduced || from === value) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = from + (value - from) * eased;
      setDisplay(current);
      fromRef.current = current;
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  const rounded = Number.isInteger(value) ? Math.round(display) : display;
  return <span className="tabular-nums">{format ? format(rounded) : rounded.toLocaleString('es-MX')}</span>;
}
