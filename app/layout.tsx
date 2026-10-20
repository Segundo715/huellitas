import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { AuthProvider } from '@/components/auth-provider';
import { ThemeProvider, themeInitScript } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { getServerSessionUser } from '@/lib/supabase/server';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-display', display: 'swap', weight: ['600', '700', '800'] });

export const metadata: Metadata = {
  title: 'Huellitas Admin',
  description: 'Panel administrativo para refugio y cuidado animal',
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
          <AuthProvider initialUser={initialUser}>{children}</AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
