'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Crown, HeartHandshake, Plus, Repeat2, Sparkles } from 'lucide-react';
import { AnimatedNumber } from '@/components/animated-number';
import { Button } from '@/components/ui/button';
import { formatMoney, formatMoneyCompact, monthlyTotals, todayIso, type Transaction } from '@/lib/data/finances';
import { cn } from '@/lib/utils';

type Donor = { name: string; total: number; count: number; recurring: boolean };

export type Sustainability = {
  coverage: number | null; // ingresos / gastos del periodo (1 = cubre el 100 %)
  runwayMonths: number | null; // meses que alcanza la reserva con el gasto mensual promedio
  reserve: number;
  monthlyCost: number;
  careShare: number | null; // parte del gasto que fue a alimentos y salud
  spend: { category: string; share: number }[]; // reparto del gasto del periodo
  donors: Donor[];
};

const CARE_CATEGORIES = new Set(['Alimentos', 'Salud veterinaria']);

export function computeSustainability(items: Transaction[], inPeriod: Transaction[]): Sustainability {
  const income = inPeriod.filter((i) => i.kind === 'ingreso').reduce((sum, i) => sum + i.amount, 0);
  const expense = inPeriod.filter((i) => i.kind === 'gasto').reduce((sum, i) => sum + i.amount, 0);
  const spendMap = new Map<string, number>();
  for (const item of inPeriod) if (item.kind === 'gasto') spendMap.set(item.category, (spendMap.get(item.category) ?? 0) + item.amount);
  const care = inPeriod.filter((i) => i.kind === 'gasto' && CARE_CATEGORIES.has(i.category)).reduce((sum, i) => sum + i.amount, 0);

  // Reserva = todo lo recibido menos todo lo gastado hasta hoy.
  const today = todayIso();
  const reserve = items.filter((i) => i.date <= today).reduce((sum, i) => sum + (i.kind === 'ingreso' ? i.amount : -i.amount), 0);

  // Costo mensual = promedio de los últimos 3 meses completos con gastos (el mes en curso está incompleto).
  const lastMonths = monthlyTotals(items, 4).slice(0, 3).filter((m) => m.expense > 0);
  const monthlyCost = lastMonths.length ? lastMonths.reduce((sum, m) => sum + m.expense, 0) / lastMonths.length : 0;

  // Donantes: quién más aportó en el periodo, y si ha donado en más de un mes.
  const months = new Map<string, Set<string>>();
  for (const item of items) {
    if (item.kind !== 'ingreso' || !item.contact?.trim()) continue;
    const key = item.contact.trim().toLowerCase();
    months.set(key, (months.get(key) ?? new Set()).add(item.date.slice(0, 7)));
  }
  const byDonor = new Map<string, Donor>();
  for (const item of inPeriod) {
    if (item.kind !== 'ingreso' || !item.contact?.trim()) continue;
    const key = item.contact.trim().toLowerCase();
    const donor = byDonor.get(key) ?? { name: item.contact.trim(), total: 0, count: 0, recurring: (months.get(key)?.size ?? 0) > 1 };
    donor.total += item.amount;
    donor.count += 1;
    byDonor.set(key, donor);
  }

  return {
    coverage: expense > 0 ? income / expense : income > 0 ? Infinity : null,
    runwayMonths: monthlyCost > 0 ? Math.max(0, reserve) / monthlyCost : null,
    reserve,
    monthlyCost,
    careShare: expense > 0 ? care / expense : null,
    spend: [...spendMap.entries()].sort((a, b) => b[1] - a[1]).map(([category, value]) => ({ category, share: value / expense })),
    donors: [...byDonor.values()].sort((a, b) => b.total - a.total).slice(0, 3),
  };
}

function coverageTone(coverage: number | null) {
  if (coverage === null) return { from: '#94a3b8', to: '#64748b', text: 'text-slate-300', label: 'Sin movimientos' };
  if (coverage >= 1.2) return { from: '#34d399', to: '#22d3ee', text: 'text-emerald-300', label: 'Con excedente' };
  if (coverage >= 1) return { from: '#38bdf8', to: '#818cf8', text: 'text-sky-300', label: 'Cubierto' };
  if (coverage >= 0.7) return { from: '#fbbf24', to: '#fb923c', text: 'text-amber-300', label: 'Casi cubierto' };
  return { from: '#fb7185', to: '#f97316', text: 'text-rose-300', label: 'Déficit' };
}

function CoverageRing({ coverage, size = 156 }: { coverage: number | null; size?: number }) {
  const [shown, setShown] = useState(0);
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const tone = coverageTone(coverage);
  const percent = coverage === null ? 0 : coverage === Infinity ? 100 : Math.round(coverage * 100);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(Math.min(percent, 100)));
    return () => cancelAnimationFrame(id);
  }, [percent]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div aria-hidden="true" className="absolute inset-4 rounded-full blur-2xl" style={{ background: `${tone.from}40` }} />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative -rotate-90" role="img" aria-label={`Las donaciones cubren el ${percent}% de los gastos`}>
        <defs>
          <linearGradient id="coverage-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={tone.from} />
            <stop offset="100%" stopColor={tone.to} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#coverage-gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown / 100)}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-4xl font-extrabold leading-none text-white">
          {coverage === Infinity ? '∞' : <AnimatedNumber value={percent} duration={1400} format={(v) => `${Math.round(v)}%`} />}
        </span>
        <span className={cn('mt-1 text-[11px] font-semibold uppercase tracking-[0.15em]', tone.text)}>{tone.label}</span>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

const SPEND_COLORS = ['#fb923c', '#f472b6', '#38bdf8', '#a78bfa', '#34d399', '#94a3b8'];

const medalStyles = ['from-amber-300 to-orange-500', 'from-slate-200 to-slate-400', 'from-orange-300 to-amber-700'];

export function SustainabilityHero({ data, loading, periodLabel, onDonate }: { data: Sustainability; loading: boolean; periodLabel: string; onDonate: () => void }) {
  const percent = data.coverage === null || data.coverage === Infinity ? null : Math.round(data.coverage * 100);
  const headline =
    data.coverage === null
      ? 'Aún no hay movimientos en este periodo.'
      : data.coverage === Infinity
        ? 'Hubo donaciones y ningún gasto: todo suma a la reserva.'
        : data.coverage >= 1
          ? `Las donaciones cubren todos los gastos y sobran ${percent! - 100}%.`
          : `Las donaciones cubren el ${percent}% de los gastos. Faltan ${100 - percent!}% para equilibrar.`;

  const runway = data.runwayMonths;
  const runwayTone = runway === null ? 'text-slate-300' : runway >= 3 ? 'text-emerald-300' : runway >= 1 ? 'text-amber-300' : 'text-rose-300';
  // La barra de reserva se llena hasta 6 meses (meta habitual de un fondo de emergencia).
  const runwayFill = runway === null ? 0 : Math.min(runway / 6, 1);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-sidebar p-6 text-white shadow-lift sm:p-8">
      <div aria-hidden="true" className="animate-aurora pointer-events-none absolute -left-24 -top-32 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
      <div aria-hidden="true" className="animate-aurora pointer-events-none absolute -bottom-40 right-10 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl [animation-delay:-6s]" />
      <div aria-hidden="true" className="animate-aurora pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full bg-orange-400/15 blur-3xl [animation-delay:-12s]" />

      <div className="relative grid gap-4 lg:grid-cols-[1.15fr_1fr] lg:gap-5">
        {/* Cobertura */}
        <div className="flex flex-col items-center gap-6 pb-2 sm:flex-row lg:pb-0">
          {loading ? <div className="h-[156px] w-[156px] shrink-0 animate-pulse rounded-full border-[12px] border-white/10" /> : <CoverageRing coverage={data.coverage} />}
          <div className="max-w-sm text-center sm:text-left">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> Sostenibilidad
            </p>
            <p className="mt-2 font-display text-lg font-bold leading-snug">{loading ? 'Calculando…' : headline}</p>
            <p className="mt-1 text-xs text-slate-400 first-letter:uppercase">{periodLabel}</p>
            <Button size="sm" onClick={onDonate} className="mt-4 bg-white/95 text-[#0f172a] shadow-lg hover:bg-white/80">
              <Plus /> Registrar donación
            </Button>
          </div>
        </div>

        {/* Reserva */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <CalendarClock aria-hidden="true" className="h-4 w-4 text-sky-300" /> Reserva de operación
              </p>
              <span className="text-xs tabular-nums text-slate-400">{loading ? '—' : formatMoney(data.reserve)}</span>
            </div>
            <p className={cn('mt-2 font-display text-3xl font-extrabold tabular-nums', runwayTone)}>
              {loading ? '—' : runway === null ? 'Sin datos' : (
                <>
                  <AnimatedNumber value={Math.round(runway * 10) / 10} duration={1200} format={(v) => v.toLocaleString('es-MX', { maximumFractionDigits: 1 })} />
                  <span className="ml-1.5 text-base font-bold text-slate-300">{runway >= 0.95 && runway < 1.05 ? 'mes' : 'meses'}</span>
                </>
              )}
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="grow-x h-full rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-emerald-300" style={{ width: `${runwayFill * 100}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {data.monthlyCost > 0 ? `Con un gasto promedio de ${formatMoney(data.monthlyCost)} al mes. Meta: 6 meses.` : 'Registra gastos para estimar cuánto dura la reserva.'}
            </p>
          </div>

          {/* Impacto */}
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 shadow-lg shadow-orange-500/30">
                <HeartHandshake aria-hidden="true" className="h-4 w-4" />
              </div>
              <p className="text-sm leading-snug text-slate-300">
                {data.careShare === null ? (
                  'Cuando registres gastos verás a dónde va cada peso.'
                ) : (
                  <>
                    De cada <span className="font-semibold text-white">$100</span> gastados,{' '}
                    <span className="font-display text-lg font-extrabold text-orange-300">${Math.round(data.careShare * 100)}</span> fueron directo a{' '}
                    <span className="font-semibold text-white">comida y salud</span> de los animales.
                  </>
                )}
              </p>
            </div>
            {data.spend.length ? (
              <div>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-white/10" role="img" aria-label={data.spend.map((row) => `${row.category} ${Math.round(row.share * 100)}%`).join(', ')}>
                  {data.spend.map((row, index) => (
                    <span key={row.category} className="grow-x h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${row.share * 100}%`, background: SPEND_COLORS[index % SPEND_COLORS.length], animationDelay: `${index * 90}ms` }} />
                  ))}
                </div>
                <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  {data.spend.slice(0, 4).map((row, index) => (
                    <li key={row.category} className="flex items-center gap-2 text-slate-400">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SPEND_COLORS[index % SPEND_COLORS.length] }} />
                      <span className="min-w-0 flex-1 truncate">{row.category}</span>
                      <span className="font-semibold tabular-nums text-white">{Math.round(row.share * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

        {/* Top donantes */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Crown aria-hidden="true" className="h-4 w-4 text-amber-300" /> Top donantes
          </p>
          {loading ? (
            <div className="mt-4 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-white/5" />)}</div>
          ) : data.donors.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Sin donantes con nombre en este periodo. Añade el donante al registrar una donación para agradecerle después.</p>
          ) : (
            <ol className="stagger mt-3 space-y-2">
              {data.donors.map((donor, index) => (
                <li key={donor.name} className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-white/5">
                  <div className={cn('relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-[#0f172a] shadow-lg', medalStyles[index])}>
                    {initials(donor.name)}
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-sidebar text-[9px] font-bold text-white ring-1 ring-white/20">{index + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{donor.name}</p>
                    <p className="flex items-center gap-1 text-[11px] text-slate-400">
                      {donor.count} {donor.count === 1 ? 'aporte' : 'aportes'}
                      {donor.recurring ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-400/10 px-1.5 text-emerald-300">
                          <Repeat2 aria-hidden="true" className="h-3 w-3" /> recurrente
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <span className="font-display text-sm font-bold tabular-nums text-white">{formatMoneyCompact(donor.total)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
