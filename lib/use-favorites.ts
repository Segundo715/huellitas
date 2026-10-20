'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'huellitas-favoritos';
const EVENT = 'huellitas-favoritos-change';

function read(): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

// Favoritos del visitante, guardados solo en su navegador y sincronizados entre pestañas.
export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback((id: string) => {
    const current = read();
    const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Sin almacenamiento (modo privado): el corazón funciona solo en esta vista.
    }
    setIds(next);
    window.dispatchEvent(new Event(EVENT));
    return next.includes(id);
  }, []);

  return { ids, isFavorite: (id: string) => ids.includes(id), toggle };
}
