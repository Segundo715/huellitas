import type { AppRole, SessionUser } from '@/lib/auth/roles';

export { getRoleLabel, type AppRole, type SessionUser } from '@/lib/auth/roles';

// Cuentas ficticias para desarrollo local; nunca contienen contraseñas.
export const demoUsers: Record<string, { name: string; role: AppRole }> = {
  'admin@huellitas.org': { name: 'Ana Morales', role: 'admin' },
  'operador@huellitas.org': { name: 'Luis Ortega', role: 'operador' },
  'voluntario@huellitas.org': { name: 'Paula Ruiz', role: 'voluntario' },
};

const STORAGE_KEY = 'huellitas-demo-session';

export function getStoredSession(): SessionUser | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Partial<SessionUser>;
    return session.email && session.role ? { id: session.id ?? session.email, name: session.name ?? session.email, email: session.email, role: session.role } : null;
  } catch {
    return null;
  }
}

export function setStoredSession(session: SessionUser) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
