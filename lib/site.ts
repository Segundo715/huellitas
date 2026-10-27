// URL pública del sitio, usada en metadatos, sitemap y vistas previas al compartir.
// Define NEXT_PUBLIC_SITE_URL en producción (por ejemplo https://huellitas.org).
export function getSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const raw = explicit || (vercel ? `https://${vercel}` : 'http://localhost:3000');
  try {
    return new URL(raw);
  } catch {
    return new URL('http://localhost:3000');
  }
}
