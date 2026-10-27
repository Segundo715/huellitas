import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { Suspense } from 'react';
import { AuthProvider } from '@/components/auth-provider';
import { RouteProgress } from '@/components/route-progress';
import { ThemeProvider, themeInitScript } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { getServerSessionUser } from '@/lib/supabase/server';
import { getSiteUrl } from '@/lib/site';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-display', display: 'swap', weight: ['600', '700', '800'] });

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: { default: 'Huellitas', template: '%s · Huellitas' },
  description: 'Refugio de animales rescatados: adopciones, cuidados y gestión del refugio.',
  applicationName: 'Huellitas',
  openGraph: { siteName: 'Huellitas', locale: 'es_MX', type: 'website' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#090d18' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialUser = await getServerSessionUser();

  return (
    <html lang="es" className={`${inter.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider>
          <Suspense fallback={null}>
            <RouteProgress />
          </Suspense>
          <AuthProvider initialUser={initialUser}>{children}</AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
