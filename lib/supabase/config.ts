export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return url && key ? { url, key } : null;
}

// El modo demo solo se desactiva explícitamente con NEXT_PUBLIC_DEMO_MODE=false.
export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
}
