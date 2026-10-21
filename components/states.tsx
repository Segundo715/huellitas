import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({ icon: Icon, title, description, action, className }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-14 text-center animate-in fade-in-0 zoom-in-95 duration-500', className)}>
      <div className="float-card flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground [animation-duration:4s]">
        <Icon aria-hidden="true" className="h-6 w-6" />
      </div>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorBanner({ message, className }: { message: string; className?: string }) {
  return (
    <div role="alert" className={cn('rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700', className)}>
      <p className="font-semibold">No se pudieron cargar los datos</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs font-medium text-destructive">{message}</p> : null;
}
