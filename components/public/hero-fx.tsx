'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Heart, PawPrint } from 'lucide-react';
import type { PublicAnimal } from '@/lib/data/public-adoption';
import { cn } from '@/lib/utils';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

// Frases cortas: caben en una línea y el titular no salta al cambiar.
const WORDS = ['mejor amigo', 'amigo de paseos', 'cómplice de siestas', 'fan número uno', 'razón para sonreír'];

/** «Tu nuevo [palabra] te está esperando», con la palabra cambiando sola. */
export function RotatingWord() {
  const [index, setIndex] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % WORDS.length), 2600);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <>
      {/* Los lectores de pantalla leen siempre la primera frase; la animación es solo visual. */}
      <span className="sr-only">{WORDS[0]}</span>
      <span key={WORDS[index]} aria-hidden="true" className="word-in inline-block text-gradient">
        {WORDS[index]}
      </span>
    </>
  );
}

// Dos hileras de huellitas que «caminan» por el fondo de la portada.
const TRAILS = [
  { from: { x: 4, y: 88 }, to: { x: 46, y: 8 }, delay: 0 },
  { from: { x: 58, y: 96 }, to: { x: 98, y: 30 }, delay: 3.5 },
];

export function PawTrail() {
  const steps = 9;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {TRAILS.map((trail, t) =>
        Array.from({ length: steps }).map((_, i) => {
          const progress = i / (steps - 1);
          const angle = (Math.atan2(trail.to.y - trail.from.y, trail.to.x - trail.from.x) * 180) / Math.PI + 90;
          // Las patas se alternan a un lado y otro del camino.
          const side = i % 2 === 0 ? -1.4 : 1.4;
          return (
            <PawPrint
              key={`${t}-${i}`}
              className="paw-step absolute h-6 w-6 text-primary"
              style={{
                left: `calc(${trail.from.x + (trail.to.x - trail.from.x) * progress}% + ${side * 10}px)`,
                top: `${trail.from.y + (trail.to.y - trail.from.y) * progress}%`,
                animationDelay: `${trail.delay + i * 0.35}s`,
                ['--r' as string]: `${angle}deg`,
                ['--o' as string]: 0.16,
              }}
            />
          );
        }),
      )}
    </div>
  );
}

const PHRASES = ['¡Llévame a casa!', '¡Adóptame!', '¿Jugamos?', 'Prometo amarte siempre', '¡Elígeme!', 'Soy muy cariñoso'];

const SLOTS = [
  'left-0 top-8 h-56 w-56 -rotate-6',
  'right-6 top-0 h-44 w-44 rotate-6',
  'bottom-0 left-20 h-48 w-48 rotate-3',
  'bottom-0 right-0 h-52 w-52 -rotate-3',
];

type Burst = { id: number; slot: number; hearts: { dx: number; rot: number; delay: number; size: number }[] };

/** Collage de fotos que flotan, se inclinan con el mouse y «hablan». */
export function HeroCollage({ animals }: { animals: PublicAnimal[] }) {
  const reduced = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [speaker, setSpeaker] = useState<{ slot: number; phrase: string; key: number } | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const counter = useRef(0);

  const spawnHearts = (slot: number) => {
    const id = ++counter.current;
    const hearts = Array.from({ length: 6 }, () => ({ dx: (Math.random() - 0.5) * 90, rot: (Math.random() - 0.5) * 50, delay: Math.random() * 400, size: 14 + Math.random() * 12 }));
    setBursts((current) => [...current, { id, slot, hearts }]);
    window.setTimeout(() => setBursts((current) => current.filter((b) => b.id !== id)), 3000);
  };

  // Cada pocos segundos una foto distinta «dice» algo y suelta corazones.
  useEffect(() => {
    if (reduced || animals.length === 0) return;
    let last = -1;
    const speak = () => {
      let slot = Math.floor(Math.random() * animals.length);
      if (slot === last) slot = (slot + 1) % animals.length;
      last = slot;
      setSpeaker({ slot, phrase: PHRASES[Math.floor(Math.random() * PHRASES.length)], key: Date.now() });
      spawnHearts(slot);
    };
    const first = window.setTimeout(speak, 1200);
    const id = window.setInterval(speak, 3400);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [reduced, animals.length]);

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (reduced || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTilt({ x: ((event.clientX - rect.left) / rect.width - 0.5) * 2, y: ((event.clientY - rect.top) / rect.height - 0.5) * 2 });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className="relative hidden h-[27rem] [perspective:1000px] lg:block"
    >
      {animals.slice(0, 4).map((animal, index) => (
        <div
          key={animal.id}
          className={cn('float-card absolute', SLOTS[index])}
          style={{ animationDelay: `${index * -1.4}s` }}
        >
          <div
            className="h-full w-full transition-transform duration-300 ease-out"
            style={{ transform: `rotateY(${tilt.x * (6 + index * 2)}deg) rotateX(${-tilt.y * (6 + index * 2)}deg) translate3d(${tilt.x * (index + 1) * 4}px, ${tilt.y * (index + 1) * 4}px, 0)` }}
          >
            <Link
              href={`/adopta/${animal.id}`}
              onMouseEnter={() => spawnHearts(index)}
              aria-label={`Conocer a ${animal.name}`}
              className="group relative block h-full w-full overflow-hidden rounded-3xl border-4 border-card shadow-lift transition-transform duration-500 hover:z-10 hover:scale-105"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={animal.photo_webp!} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold text-[#0f172a] shadow">
                {animal.name}
                <Heart className="h-3 w-3 fill-rose-500 text-rose-500 opacity-0 transition group-hover:opacity-100" />
              </span>
            </Link>

            {speaker?.slot === index ? (
              <span
                key={speaker.key}
                className="bubble-pop pointer-events-none absolute -top-12 left-1/2 z-20 whitespace-nowrap rounded-2xl bg-white px-3.5 py-2 text-sm font-bold text-[#0f172a] shadow-lift after:absolute after:left-1/2 after:top-full after:-ml-2 after:border-8 after:border-transparent after:border-t-white"
              >
                {speaker.phrase}
              </span>
            ) : null}

            {bursts
              .filter((burst) => burst.slot === index)
              .flatMap((burst) =>
                burst.hearts.map((heart, h) => (
                  <Heart
                    key={`${burst.id}-${h}`}
                    aria-hidden="true"
                    className="heart-rise pointer-events-none absolute left-1/2 top-1/3 z-20 fill-rose-500 text-rose-500 drop-shadow"
                    style={{ width: heart.size, height: heart.size, animationDelay: `${heart.delay}ms`, ['--dx' as string]: `${heart.dx}px`, ['--rot' as string]: `${heart.rot}deg` }}
                  />
                )),
              )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** En móvil, en lugar del collage: una tira de fotos que se desliza sin fin. */
export function PhotoMarquee({ animals }: { animals: PublicAnimal[] }) {
  if (animals.length === 0) return null;
  // Se duplica la lista para que el bucle no tenga saltos.
  const loop = [...animals, ...animals];
  return (
    <div className="relative -mx-4 overflow-hidden py-2 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)] lg:hidden">
      <div className="marquee flex w-max gap-3 hover:[animation-play-state:paused]">
        {loop.map((animal, index) => (
          <Link
            key={`${animal.id}-${index}`}
            href={`/adopta/${animal.id}`}
            tabIndex={index >= animals.length ? -1 : undefined}
            aria-hidden={index >= animals.length || undefined}
            className={cn('relative h-36 w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-card shadow-card', index % 2 ? 'rotate-2' : '-rotate-2')}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={animal.photo_webp!} alt={index >= animals.length ? '' : `Foto de ${animal.name}`} className="h-full w-full object-cover" />
            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-[#0f172a]">{animal.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
