import type { NextConfig } from 'next';

// Cabeceras de seguridad para todas las respuestas.
const securityHeaders = [
  // Impide que otros sitios metan la app en un iframe (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), browsing-topics=()' },
  // Solo tiene efecto bajo HTTPS (producción).
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  // Hay otro package-lock.json en la carpeta de arriba; la raíz es esta.
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
