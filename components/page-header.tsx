import type { LucideIcon } from 'lucide-react';
import { AnimatedNumber } from '@/components/animated-number';
import { cn } from '@/lib/utils';

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-primary to-warm" />
          {eyebrow}
        </p>
        <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

const tones = {
  sky: { icon: 'from-sky-400 to-sky-600 shadow-sky-500/30', glow: 'bg-sky-500/10' },
  emerald: { icon: 'from-emerald-400 to-emerald-600 shadow-emerald-500/30', glow: 'bg-emerald-500/10' },
  amber: { icon: 'from-amber-400 to-orange-500 shadow-amber-500/30', glow: 'bg-amber-500/10' },
  rose: { icon: 'from-rose-400 to-rose-600 shadow-rose-500/30', glow: 'bg-rose-500/10' },
  violet: { icon: 'from-violet-400 to-indigo-600 shadow-violet-500/30', glow: 'bg-violet-500/10' },
  slate: { icon: 'from-slate-400 to-slate-600 shadow-slate-500/30', glow: 'bg-slate-500/10' },
};

// Variación contra el periodo anterior. `good` indica si subir es bueno (ingresos) o malo (gastos).
export type StatDelta = { value: number; good: 'up' | 'down'; label?: string };

function DeltaPill({ delta }: { delta: StatDelta }) {
  const rounded = Math.round(delta.value * 100);
  const flat = rounded === 0;
  const positive = (rounded > 0) === (delta.good === 'up');
  return (
    <span
      title={delta.label}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
        flat ? 'bg-muted text-muted-foreground' : positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
      )}
    >
      {flat ? '=' : rounded > 0 ? '▲' : '▼'} {Math.abs(rounded) > 999 ? '+999' : Math.abs(rounded)}%
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'sky',
  hint,
  delta,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof tones;
  hint?: string;
  delta?: StatDelta | null;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:p-5">
      <div aria-hidden="true" className={cn('pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-125', tones[tone].glow)} />
      <div className="relative flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]', tones[tone].icon)}>
          <Icon aria-hidden="true" className="h-4 w-4" />
        </div>
      </div>
      <p className="relative mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground">{typeof value === 'number' ? <AnimatedNumber value={value} /> : value}</p>
      {hint || delta ? (
        <p className="relative mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {delta ? <DeltaPill delta={delta} /> : null}
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95',
        active ? 'border-primary bg-primary text-primary-foreground shadow-glow' : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
