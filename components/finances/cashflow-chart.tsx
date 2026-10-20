'use client';

import { useState } from 'react';
import { formatMoney, formatMoneyCompact } from '@/lib/data/finances';
import { cn } from '@/lib/utils';

// Colores categóricos 1 y 2 de la paleta validada (no se reutilizan los de estado).
const INCOME_COLOR = '#2a78d6';
const EXPENSE_COLOR = '#eb6834';

type Month = { key: string; label: string; income: number; expense: number };

function niceMax(value: number) {
  if (value <= 0) return 1000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value / 4)! * magnitude;
  return Math.ceil(value / step) * step;
}

export function CashflowChart({ months }: { months: Month[] }) {
  const [active, setActive] = useState<string | null>(null);
  const max = niceMax(Math.max(...months.flatMap((m) => [m.income, m.expense])));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ratio * max);
  const hovered = months.find((m) => m.key === active);

  return (
    <figure>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: INCOME_COLOR }} /> Ingresos
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: EXPENSE_COLOR }} /> Gastos
        </span>
        <span className="ml-auto h-4 tabular-nums" aria-live="polite">
          {hovered ? (
            <>
              <span className="font-semibold text-foreground">{hovered.label}</span> · {formatMoney(hovered.income)} / {formatMoney(hovered.expense)} · balance{' '}
              <span className="font-semibold text-foreground">{formatMoney(hovered.income - hovered.expense)}</span>
            </>
          ) : (
            'Pasa el cursor sobre un mes · abajo, el balance neto'
          )}
        </span>
      </div>

      <div className="flex gap-2">
        {/* Eje Y */}
        <div className="relative h-48 w-12 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
          {ticks.map((tick) => (
            <span key={tick} className="absolute right-0" style={{ bottom: `${(tick / max) * 100}%`, transform: 'translateY(50%)' }}>
              {formatMoneyCompact(tick)}
            </span>
          ))}
        </div>

        <div className="relative h-48 flex-1">
          {ticks.map((tick) => (
            <div key={tick} className="absolute inset-x-0 border-t border-border/70" style={{ bottom: `${(tick / max) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end justify-around">
            {months.map((month, monthIndex) => (
              <button
                key={month.key}
                type="button"
                onMouseEnter={() => setActive(month.key)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(month.key)}
                onBlur={() => setActive(null)}
                aria-label={`${month.label}: ingresos ${formatMoney(month.income)}, gastos ${formatMoney(month.expense)}`}
                className="group flex h-full flex-1 items-end justify-center gap-0.5 rounded-lg px-1 outline-none transition hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {[
                  { value: month.income, color: INCOME_COLOR },
                  { value: month.expense, color: EXPENSE_COLOR },
                ].map((bar, index) => (
                  <span
                    key={index}
                    className="grow-y w-full max-w-5 rounded-t-[4px] transition-[opacity,filter] group-hover:brightness-110"
                    style={{
                      height: `${(bar.value / max) * 100}%`,
                      minHeight: bar.value > 0 ? 2 : 0,
                      background: `linear-gradient(to top, ${bar.color}cc, ${bar.color})`,
                      opacity: active && active !== month.key ? 0.4 : 1,
                      animationDelay: `${monthIndex * 70 + index * 35}ms`,
                    }}
                  />
                ))}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ml-14 mt-2 flex justify-around text-xs text-muted-foreground">
        {months.map((month, index) => {
          const net = month.income - month.expense;
          const current = index === months.length - 1;
          return (
            <span key={month.key} className="flex flex-1 flex-col items-center gap-0.5">
              <span className={cn(month.key === active || current ? 'font-semibold text-foreground' : undefined, current && 'rounded-full bg-primary/10 px-2 text-primary')}>
                {month.label}
              </span>
              {month.income || month.expense ? (
                <span className={cn('text-[10px] font-semibold tabular-nums', net >= 0 ? 'text-emerald-700' : 'text-rose-600')}>
                  {net >= 0 ? '+' : '−'}
                  {formatMoneyCompact(Math.abs(net))}
                </span>
              ) : (
                <span className="text-[10px]">—</span>
              )}
            </span>
          );
        })}
      </div>
      <figcaption className="sr-only">Ingresos y gastos de los últimos {months.length} meses</figcaption>
    </figure>
  );
}
