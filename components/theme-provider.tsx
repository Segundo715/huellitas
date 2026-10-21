'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'huellitas-theme';

// Se ejecuta antes de pintar (en <head>) para evitar el destello de tema incorrecto.
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');var d=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  /** `origin`: punto desde el que se expande el nuevo tema (p. ej. el botón que se pulsó). */
  setTheme: (theme: Theme, origin?: { x: number; y: number }) => void;
  toggleTheme: (origin?: { x: number; y: number }) => void;
};

type ViewTransitionDocument = Document & { startViewTransition?: (update: () => void) => { ready: Promise<void> } };

// El tema nuevo aparece como un círculo que crece desde `origin`.
// Sin soporte de View Transitions (o con «reducir movimiento») el cambio es instantáneo.
function revealTheme(dark: boolean, origin: { x: number; y: number } | undefined, apply: () => void) {
  const doc = document as ViewTransitionDocument;
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!origin || !doc.startViewTransition || reduced || root.classList.contains('dark') === dark) {
    apply();
    return;
  }
  const transition = doc.startViewTransition(() => {
    root.classList.add('theme-switching');
    root.classList.toggle('dark', dark);
    apply();
  });
  transition.ready
    .then(() => {
      const radius = Math.hypot(Math.max(origin.x, window.innerWidth - origin.x), Math.max(origin.y, window.innerHeight - origin.y));
      root.animate(
        { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${radius}px at ${origin.x}px ${origin.y}px)`] },
        { duration: 600, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => {})
    .finally(() => root.classList.remove('theme-switching'));
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [systemDark, setSystemDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setThemeState(readStoredTheme());
    setSystemDark(systemPrefersDark());
    setReady(true);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    // Hasta leer la preferencia guardada, manda el script de <head>.
    if (!ready) return;
    const root = document.documentElement;
    // Desactiva las transiciones un instante para que el cambio de tema sea limpio.
    root.classList.add('theme-switching');
    root.classList.toggle('dark', resolvedTheme === 'dark');
    const id = window.setTimeout(() => root.classList.remove('theme-switching'), 0);
    return () => window.clearTimeout(id);
  }, [ready, resolvedTheme]);

  const setTheme = useCallback(
    (next: Theme, origin?: { x: number; y: number }) => {
      const dark = next === 'dark' || (next === 'system' && systemDark);
      revealTheme(dark, origin, () => setThemeState(next));
      try {
        if (next === 'system') localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Sin almacenamiento disponible: el tema solo dura esta sesión.
      }
    },
    [systemDark],
  );

  const toggleTheme = useCallback((origin?: { x: number; y: number }) => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark', origin), [resolvedTheme, setTheme]);

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme, toggleTheme }), [theme, resolvedTheme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme debe usarse dentro de <ThemeProvider>.');
  return context;
}
