'use client';

import { useEffect, useRef } from 'react';

// Abre el formulario de alta cuando se llega con ?nuevo=1 (accesos rápidos del dashboard)
// y limpia el parámetro para que recargar la página no lo vuelva a abrir.
export function useCreateParam(openCreate: () => void) {
  const openRef = useRef(openCreate);
  openRef.current = openCreate;

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('nuevo') !== '1') return;
    url.searchParams.delete('nuevo');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    openRef.current();
  }, []);
}
