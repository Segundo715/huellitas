'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearStoredSession, getStoredSession } from '@/lib/auth-demo';
import { isAppRole, type SessionUser } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/client';
import { isDemoMode } from '@/lib/supabase/config';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  user: SessionUser | null;
  status: AuthStatus;
  mode: 'demo' | 'supabase';
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, initialUser }: { children: React.ReactNode; initialUser: SessionUser | null }) {
  const demo = isDemoMode();
  const [user, setUser] = useState<SessionUser | null>(initialUser);
  const [status, setStatus] = useState<AuthStatus>(initialUser ? 'authenticated' : demo ? 'loading' : 'unauthenticated');

  useEffect(() => {
    if (demo) {
      const session = getStoredSession();
      setUser(session);
      setStatus(session ? 'authenticated' : 'unauthenticated');
      return;
    }

    const supabase = createClient();
    if (!supabase) return;

    // Mantiene la UI sincronizada si la sesión expira o se cierra en otra pestaña.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        setStatus('unauthenticated');
        return;
      }

      const authUser = session.user;
      const role = authUser.app_metadata.role;
      if (!authUser.email || !isAppRole(role)) return;

      const fullName = authUser.user_metadata.full_name;
      setUser({
        id: authUser.id,
        email: authUser.email,
        name: typeof fullName === 'string' && fullName ? fullName : authUser.email.split('@')[0],
        role,
        avatarPath: typeof authUser.user_metadata.avatar_path === 'string' ? authUser.user_metadata.avatar_path : null,
      });
      setStatus('authenticated');
    });

    return () => data.subscription.unsubscribe();
  }, [demo]);

  const signOut = useCallback(async () => {
    if (!demo) {
      await createClient()?.auth.signOut();
    }
    clearStoredSession();
    setUser(null);
    setStatus('unauthenticated');
    // Recarga completa para que el middleware y los Server Components vean las cookies limpias.
    window.location.assign('/login');
  }, [demo]);

  const value = useMemo<AuthContextValue>(() => ({ user, status, mode: demo ? 'demo' : 'supabase', signOut }), [user, status, demo, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }
  return context;
}
