import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { canAccessPath, isAppRole } from '@/lib/auth/roles';
import { getSupabasePublicConfig, isDemoMode } from '@/lib/supabase/config';

// Páginas abiertas al público (adopción y archivos para buscadores). Todo lo demás exige sesión y rol.
const PUBLIC_PREFIXES = ['/adopta'];
const PUBLIC_FILES = ['/robots.txt', '/sitemap.xml'];

function isPublicPath(pathname: string) {
  return PUBLIC_FILES.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseConfig = getSupabasePublicConfig();

  if (isDemoMode() || !supabaseConfig) {
    return response;
  }

  const supabase = createServerClient(supabaseConfig.url, supabaseConfig.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Patrón recomendado por @supabase/ssr: refrescar el token en la petición y en la respuesta.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() valida el JWT contra Supabase Auth; no usar getSession() para autorizar.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const role = user?.app_metadata.role;
  const hasRole = isAppRole(role);

  const redirectTo = (path: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = '';
    Object.entries(params ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));
    const redirect = NextResponse.redirect(url);
    // Conserva las cookies de sesión refrescadas.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (pathname === '/login') {
    return user && hasRole ? redirectTo('/') : response;
  }

  if (pathname.startsWith('/api') || pathname.startsWith('/auth') || isPublicPath(pathname)) {
    return response;
  }

  if (!user) {
    return redirectTo('/login', { next: `${pathname}${search}` });
  }

  if (!hasRole) {
    return redirectTo('/login', { error: 'sin-rol' });
  }

  if (!canAccessPath(role, pathname)) {
    return redirectTo('/', { denied: pathname });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
