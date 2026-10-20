'use client';

import { Toaster as Sonner } from 'sonner';
import { useTheme } from '@/components/theme-provider';

type ToasterProps = React.ComponentProps<typeof Sonner>;

function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  return <Sonner position="top-right" theme={resolvedTheme} richColors closeButton toastOptions={{ classNames: { toast: 'rounded-xl font-sans shadow-lift' } }} {...props} />;
}

export { Toaster };
