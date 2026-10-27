import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';

// Solo las páginas de adopción son públicas; el panel interno no debe indexarse.
export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();
  return {
    rules: { userAgent: '*', allow: ['/adopta', '/_next/', '/fotos/', '/logo.png'], disallow: ['/'] },
    sitemap: new URL('/sitemap.xml', site).toString(),
    host: site.origin,
  };
}
