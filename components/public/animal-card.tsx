'use client';

import Link from 'next/link';
import { Heart, Mars, PawPrint, Venus } from 'lucide-react';
import { celebrate } from '@/lib/celebrate';
import { ageGroup, ageGroupLabel, ageLabel, type PublicAnimal } from '@/lib/data/public-adoption';
import { cn } from '@/lib/utils';

export function SexIcon({ sex, className }: { sex: string | null; className?: string }) {
  if (sex === 'Hembra') return <Venus aria-label="Hembra" className={cn('text-pink-500', className)} />;
  if (sex === 'Macho') return <Mars aria-label="Macho" className={cn('text-sky-500', className)} />;
  return null;
}

export function AnimalPhoto({ animal, className }: { animal: Pick<PublicAnimal, 'photo_webp' | 'name'>; className?: string }) {
  return animal.photo_webp ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={animal.photo_webp} alt={`Foto de ${animal.name}`} className={cn('h-full w-full object-cover', className)} loading="lazy" />
  ) : (
    <div className={cn('flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-100 via-indigo-50 to-orange-100 text-primary dark:from-sky-500/10 dark:via-indigo-500/10 dark:to-orange-500/10', className)}>
      <PawPrint className="h-14 w-14 opacity-60" />
    </div>
  );
}

export function FavoriteButton({ active, onToggle, name, className }: { active: boolean; onToggle: () => void; name: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        // Al guardar un favorito, una mini explosión de corazones sale del botón.
        if (!active) {
          const rect = event.currentTarget.getBoundingClientRect();
          celebrate({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, 10);
        }
        onToggle();
      }}
      aria-pressed={active}
      aria-label={active ? `Quitar a ${name} de favoritos` : `Guardar a ${name} en favoritos`}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-md backdrop-blur transition hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-slate-900/80 dark:text-slate-200',
        active && 'text-rose-500 dark:text-rose-400',
        className,
      )}
    >
      <Heart className={cn('h-5 w-5 transition', active && 'fill-current')} />
    </button>
  );
}

export function AnimalCard({ animal, favorite, onToggleFavorite }: { animal: PublicAnimal; favorite: boolean; onToggleFavorite: () => void }) {
  const reserved = animal.status === 'Reservado';
  const group = ageGroup(animal);
  return (
    <Link
      href={`/adopta/${animal.id}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-square overflow-hidden">
        <AnimalPhoto animal={animal} className={cn('transition-transform duration-500 group-hover:scale-105', reserved && 'grayscale-[40%]')} />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
        <FavoriteButton active={favorite} onToggle={onToggleFavorite} name={animal.name} className="absolute right-3 top-3" />
        {reserved ? (
          <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-[#0f172a] shadow">Adopción en proceso</span>
        ) : group === 'Cachorro' || group === 'Senior' ? (
          <span className={cn('absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow', group === 'Senior' ? 'bg-violet-500 text-white' : 'bg-emerald-400 text-[#0f172a]')}>
            {ageGroupLabel(group, animal.type)}
          </span>
        ) : null}
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white">
          <h3 className="font-display text-2xl font-extrabold drop-shadow">{animal.name}</h3>
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold backdrop-blur">{ageLabel(animal.age_years)}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <SexIcon sex={animal.sex} className="h-4 w-4" />
          {[animal.breed || animal.type, animal.size].filter(Boolean).join(' · ')}
        </p>
        {animal.public_description ? <p className="line-clamp-2 text-sm">{animal.public_description}</p> : null}
        <span className="mt-auto pt-1 text-sm font-semibold text-primary transition group-hover:translate-x-0.5">
          {reserved ? 'Ver su historia →' : `Conocer a ${animal.name} →`}
        </span>
      </div>
    </Link>
  );
}
