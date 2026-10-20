import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicConfig, isDemoMode } from '@/lib/supabase/config';

let browserClient: SupabaseClient | null = null;

// Devuelve null en modo demo o si faltan variables, y así el resto de la app usa almacenamiento local.
export function createClient(): SupabaseClient | null {
  if (isDemoMode()) return null;

  const config = getSupabasePublicConfig();
  if (!config) return null;

  browserClient ??= createBrowserClient(config.url, config.key);
  return browserClient;
}
