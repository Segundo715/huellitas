import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getSupabasePublicConfig, isDemoMode } from '@/lib/supabase/config';
import { isAppRole, type SessionUser } from '@/lib/auth/roles';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const config = getSupabasePublicConfig();

  if (!config) {
    return null;
  }

  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // The server component cannot set cookies in all cases.
        }
      },
    },
  });
}

// Usuario autenticado validado contra Supabase Auth (no confía en datos del navegador).
export async function getServerSessionUser(): Promise<SessionUser | null> {
  if (isDemoMode()) return null;

  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isAppRole(user.app_metadata.role)) return null;

  const fullName = user.user_metadata.full_name;
  return {
    id: user.id,
    email: user.email,
    name: typeof fullName === 'string' && fullName ? fullName : user.email.split('@')[0],
    role: user.app_metadata.role,
    avatarPath: typeof user.user_metadata.avatar_path === 'string' ? user.user_metadata.avatar_path : null,
  };
}
