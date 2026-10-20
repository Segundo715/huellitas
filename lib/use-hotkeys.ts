'use client';

import { useEffect, useRef } from 'react';

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

type Options = {
  onPalette: () => void;
  /** Recibe la letra pulsada tras «G» (en mayúscula). */
  onGoTo: (key: string) => void;
};

// Atajos globales al estilo de las herramientas profesionales:
// Ctrl/⌘ + K o «/» abre la paleta; «G» seguido de una letra salta a una sección.
export function useHotkeys({ onPalette, onGoTo }: Options) {
  const handlers = useRef({ onPalette, onGoTo });
  handlers.current = { onPalette, onGoTo };

  useEffect(() => {
    let pendingG = 0;

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        handlers.current.onPalette();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      // Con un diálogo abierto, las letras pertenecen al diálogo.
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;

      if (event.key === '/') {
        event.preventDefault();
        handlers.current.onPalette();
        return;
      }

      const key = event.key.toUpperCase();
      if (pendingG && Date.now() - pendingG < 1200 && /^[A-Z]$/.test(key)) {
        pendingG = 0;
        handlers.current.onGoTo(key);
        return;
      }
      pendingG = key === 'G' ? Date.now() : 0;
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
