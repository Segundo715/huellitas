'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Barra fina en la parte superior mientras se carga otra página.
// El App Router no avisa cuándo empieza una navegación, así que la iniciamos
// al hacer clic en un enlace interno y la completamos cuando cambia la ruta.
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Mismo destino (o solo cambia el #ancla): no hay carga.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      window.clearInterval(timer.current);
      setProgress(0.08);
      // Avanza rápido al principio y se frena cerca del final, como las barras de los navegadores.
      timer.current = window.setInterval(() => setProgress((p) => (p === null ? null : Math.min(0.92, p + (0.95 - p) * 0.12))), 180);
    };
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.clearInterval(timer.current);
    };
  }, []);

  useEffect(() => {
    window.clearInterval(timer.current);
    setProgress((p) => (p === null ? null : 1));
    const id = window.setTimeout(() => setProgress(null), 350);
    return () => window.clearTimeout(id);
  }, [pathname, searchParams]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[3px]">
      <div
        className="route-progress h-full transition-[transform,opacity] duration-300 ease-out"
        style={{ transform: `scaleX(${progress ?? 0})`, opacity: progress === null || progress === 1 ? 0 : 1, transitionDelay: progress === 1 ? '0ms, 150ms' : undefined }}
      />
    </div>
  );
}
