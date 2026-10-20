import type { AppRole, SessionUser } from '@/lib/auth/roles';

export { getRoleLabel, type AppRole, type SessionUser } from '@/lib/auth/roles';

// Solo para NEXT_PUBLIC_DEMO_MODE=true. En modo real la sesión vive en cookies de Supabase.
export const demoUsers: Record<string, { password: string; name: string; role: AppRole }> = {
  'admin@huellitas.org': { password: 'admin123', name: 'Ana Morales', role: 'admin' },
  'operador@huellitas.org': { password: 'operador123', name: 'Luis Ortega', role: 'operador' },
  'voluntario@huellitas.org': { password: 'voluntario123', name: 'Paula Ruiz', role: 'voluntario' },
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
