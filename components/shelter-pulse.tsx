'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, CheckCircle2 } from 'lucide-react';
import { AnimatedNumber } from '@/components/animated-number';
import { STALE_AFTER_DAYS, daysSinceUpdate, isClosedStage, type AdoptionRequest } from '@/lib/data/adoptions';
import type { Animal } from '@/lib/data/animals';
import type { InventoryItem } from '@/lib/data/inventory';
import { cn } from '@/lib/utils';

export type PulseFactor = { label: string; impact: number; href: string };

export type Pulse = { score: number; level: 'Excelente' | 'Estable' | 'Atención' | 'Crítico'; factors: PulseFactor[] };

// «Pulso del refugio»: un índice de 0 a 100 que resume la salud operativa.
// Cada problema detectado resta puntos (con tope por categoría) y se explica en la lista,
// así el número nunca es una caja negra.
export function computePulse({ animals, inventory, adoptions, monthBalance }: { animals: Animal[]; inventory: InventoryItem[]; adoptions: AdoptionRequest[]; monthBalance: number }): Pulse {
  const factors: PulseFactor[] = [];
  const add = (label: string, impact: number, href: string) => {
    if (impact < 0) factors.push({ label, impact, href });
  };

  const critical = inventory.filter((item) => item.status === 'Caducado' || item.status === 'Agotado').length;
  const warning = inventory.filter((item) => item.status === 'Bajo stock' || item.status === 'Por caducar').length;
  const active = adoptions.filter((request) => !isClosedStage(request.stage));
  const stale = active.filter((request) => daysSinceUpdate(request) >= STALE_AFTER_DAYS).length;
  const fresh = adoptions.filter((request) => request.stage === 'Nueva').length;
  const treatment = animals.filter((animal) => animal.status === 'En tratamiento').length;

  add(`${critical} ${critical === 1 ? 'insumo agotado o caducado' : 'insumos agotados o caducados'}`, -Math.min(32, critical * 8), '/inventario');
  add(`${warning} ${warning === 1 ? 'insumo con stock bajo o por caducar' : 'insumos con stock bajo o por caducar'}`, -Math.min(15, warning * 3), '/inventario');
  add(`${stale} ${stale === 1 ? 'solicitud estancada' : 'solicitudes estancadas'} (+${STALE_AFTER_DAYS} días)`, -Math.min(20, stale * 5), '/adopciones/solicitudes');
  add(`${fresh} ${fresh === 1 ? 'solicitud nueva sin revisar' : 'solicitudes nuevas sin revisar'}`, -Math.min(9, fresh * 3), '/adopciones');
  add(`${treatment} ${treatment === 1 ? 'animal en tratamiento' : 'animales en tratamiento'}`, -Math.min(10, treatment * 2), '/animales');
  add('Balance del mes en negativo', monthBalance < 0 ? -12 : 0, '/donaciones');

  const score = Math.max(0, Math.min(100, 100 + factors.reduce((sum, factor) => sum + factor.impact, 0)));
  const level = score >= 85 ? 'Excelente' : score >= 65 ? 'Estable' : score >= 40 ? 'Atención' : 'Crítico';
  return { score, level, factors: factors.sort((a, b) => a.impact - b.impact) };
}

const levelStyles = {
  Excelente: { from: '#34d399', to: '#22d3ee', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  Estable: { from: '#38bdf8', to: '#818cf8', text: 'text-sky-300', dot: 'bg-sky-400' },
  Atención: { from: '#fbbf24', to: '#fb923c', text: 'text-amber-300', dot: 'bg-amber-400' },
  Crítico: { from: '#fb7185', to: '#f97316', text: 'text-rose-300', dot: 'bg-rose-400' },
};

export function PulseRing({ score, level, size = 148 }: { score: number; level: Pulse['level']; size?: number }) {
  const [shown, setShown] = useState(0);
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const style = levelStyles[level];

  // Arranca vacío y se llena: la transición CSS hace la animación.
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(score));
    return () => cancelAnimationFrame(id);
  }, [score]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div aria-hidden="true" className="absolute inset-3 rounded-full blur-2xl" style={{ background: `${style.from}33` }} />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative -rotate-90" role="img" aria-label={`Pulso del refugio: ${score} de 100, ${level}`}>
        <defs>
          <linearGradient id="pulse-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={style.from} />
            <stop offset="100%" stopColor={style.to} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#pulse-gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown / 100)}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-extrabold leading-none text-white">
          <AnimatedNumber value={score} duration={1400} />
        </span>
        <span className={cn('mt-1 text-xs font-semibold uppercase tracking-[0.15em]', style.text)}>{level}</span>
      </div>
    </div>
  );
}

export function PulseFactors({ pulse }: { pulse: Pulse }) {
  if (!pulse.factors.length) {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-200">
        <CheckCircle2 className="h-4 w-4" /> Sin problemas detectados. ¡Excelente trabajo!
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {pulse.factors.slice(0, 4).map((factor) => (
        <li key={factor.label}>
          <Link href={factor.href} className="group flex items-start gap-2 rounded-lg px-2 py-1 text-[13px] text-slate-300 transition hover:bg-white/5 hover:text-white">
            <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500 group-hover:text-sky-300" />
            <span className="min-w-0 flex-1 leading-snug">{factor.label}</span>
            <span className="font-semibold tabular-nums text-rose-300">{factor.impact}</span>
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
