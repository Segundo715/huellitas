'use client';

import { useEffect } from 'react';

// Último recurso si falla el layout raíz: no puede depender de estilos ni componentes de la app.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'system-ui, sans-serif', background: '#f8fafc', color: '#0f172a', padding: 16 }}>
        <div role="alert" style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>Algo salió mal</h1>
          <p style={{ color: '#475569' }}>La aplicación tuvo un problema inesperado. Inténtalo de nuevo en un momento.</p>
          {error.digest ? <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>Código: {error.digest}</p> : null}
          <button type="button" onClick={reset} style={{ marginTop: 8, padding: '10px 18px', borderRadius: 8, border: 0, background: '#0f172a', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
