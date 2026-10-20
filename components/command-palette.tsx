'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Check, CornerDownLeft, LogOut, Monitor, Moon, PawPrint, Search, Sparkles, Sun, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { useTheme, type Theme } from '@/components/theme-provider';
import { Badge } from '@/components/ui/badge';
import { STAFF_ROLES } from '@/lib/auth/roles';
import { animalStatusVariant, listAnimals, type Animal } from '@/lib/data/animals';
import { normalize, visibleQuickActions, visibleSections } from '@/lib/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type PaletteItem = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  keywords: string;
  shortcut?: string[];
  checked?: boolean;
  animal?: Animal;
  perform: () => void;
};

// Cada palabra de la consulta debe aparecer en el texto (tolerando plurales y acentos),
// así «gatos en tratamiento» o «perro disponible macho» funcionan como filtros naturales.
const STOP_WORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'en', 'y', 'con', 'para', 'un', 'una']);

function tokenize(query: string) {
  return normalize(query)
    .split(/\s+/)
    .filter((token) => token && !STOP_WORDS.has(token));
}

function tokenMatches(haystack: string, token: string) {
  if (haystack.includes(token)) return true;
  if (token.length > 3 && token.endsWith('es') && haystack.includes(token.slice(0, -2))) return true;
  return token.length > 2 && token.endsWith('s') && haystack.includes(token.slice(0, -1));
}

function score(item: PaletteItem, tokens: string[]) {
  if (!tokens.length) return 1;
  const label = normalize(item.label);
  const haystack = `${label} ${normalize(item.keywords)} ${normalize(item.hint ?? '')}`;
  if (!tokens.every((token) => tokenMatches(haystack, token))) return 0;
  let total = 1;
  for (const token of tokens) {
    if (label.startsWith(token)) total += 3;
    else if (label.includes(token)) total += 2;
  }
  return total;
}

const GROUP_ORDER = ['Animales', 'Acciones rápidas', 'Ir a', 'Preferencias', 'Cuenta'];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [animals, setAnimals] = useState<Animal[] | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isStaff = user ? STAFF_ROLES.includes(user.role) : false;

  // Carga los animales al abrir para que la búsqueda sea instantánea.
  useEffect(() => {
    if (!open || !isStaff) return;
    listAnimals(createClient())
      .then(setAnimals)
      .catch(() => setAnimals([]));
  }, [open, isStaff]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const items = useMemo<PaletteItem[]>(() => {
    if (!user) return [];
    const close = () => onOpenChange(false);
    const go = (href: string) => {
      close();
      // Las acciones «?nuevo=1» se leen al montar la página; si ya estamos ahí, recargamos.
      if (href.includes('?') && href.split('?')[0] === pathname) window.location.assign(href);
      else router.push(href);
    };

    const list: PaletteItem[] = [];

    for (const action of visibleQuickActions(user.role)) {
      list.push({ id: `action-${action.href}`, group: 'Acciones rápidas', label: action.label, icon: action.icon, keywords: action.keywords ?? '', perform: () => go(action.href) });
    }

    for (const section of visibleSections(user.role)) {
      for (const item of section.items) {
        list.push({
          id: `nav-${item.href}`,
          group: 'Ir a',
          label: item.label,
          hint: section.title,
          icon: item.icon,
          keywords: item.keywords ?? '',
          shortcut: item.shortcut ? ['G', item.shortcut] : undefined,
          perform: () => go(item.href),
        });
      }
    }

    for (const animal of animals ?? []) {
      list.push({
        id: `animal-${animal.id}`,
        group: 'Animales',
        label: animal.name,
        hint: [animal.type, animal.breed, animal.age_years ? `${animal.age_years} ${animal.age_years === 1 ? 'año' : 'años'}` : null].filter(Boolean).join(' · '),
        icon: PawPrint,
        keywords: [animal.type, animal.breed, animal.status, animal.sex, animal.location].filter(Boolean).join(' '),
        animal,
        perform: () => go(`/animales/${animal.id}`),
      });
    }

    const themes: Array<{ value: Theme; label: string; icon: LucideIcon }> = [
      { value: 'light', label: 'Tema claro', icon: Sun },
      { value: 'dark', label: 'Tema oscuro', icon: Moon },
      { value: 'system', label: 'Tema del sistema', icon: Monitor },
    ];
    for (const option of themes) {
      list.push({
        id: `theme-${option.value}`,
        group: 'Preferencias',
        label: option.label,
        icon: option.icon,
        keywords: 'apariencia modo color noche dia',
        checked: theme === option.value,
        perform: () => setTheme(option.value),
      });
    }

    list.push({ id: 'signout', group: 'Cuenta', label: 'Cerrar sesión', icon: LogOut, keywords: 'salir logout', perform: () => { close(); void signOut(); } });
    return list;
  }, [user, animals, theme, setTheme, signOut, router, pathname, onOpenChange]);

  const groups = useMemo(() => {
    const tokens = tokenize(query);
    const scored = items
      .map((item) => ({ item, score: score(item, tokens) }))
      // Sin consulta, los animales no se listan: solo aparecen al buscar.
      .filter(({ item, score: value }) => value > 0 && (tokens.length > 0 || item.group !== 'Animales'));

    return GROUP_ORDER.map((name) => ({
      name,
      items: scored
        .filter(({ item }) => item.group === name)
        .sort((a, b) => b.score - a.score)
        .slice(0, name === 'Animales' ? 6 : 12)
        .map(({ item }) => item),
    })).filter((group) => group.items.length > 0);
  }, [items, query]);

  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  useEffect(() => setActiveIndex(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!flat.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % flat.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + flat.length) % flat.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      flat[activeIndex]?.perform();
    }
  };

  const searchingAnimals = isStaff && animals === null && query.trim().length > 0;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onKeyDown={onKeyDown}
          className="fixed left-1/2 top-[10vh] z-50 w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-2xl border bg-popover/95 text-popover-foreground shadow-2xl ring-1 ring-black/5 backdrop-blur-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.97] data-[state=open]:zoom-in-[0.97] data-[state=open]:slide-in-from-top-2 dark:ring-white/5"
        >
          <DialogPrimitive.Title className="sr-only">Paleta de comandos</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Busca animales, secciones y acciones. Usa las flechas para moverte y Enter para abrir.</DialogPrimitive.Description>

          <div className="flex items-center gap-3 border-b px-4">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={isStaff ? 'Prueba «gatos en tratamiento» o «registrar animal»…' : 'Busca una sección o acción…'}
              aria-label="Buscar"
              aria-controls="command-list"
              aria-activedescendant={flat[activeIndex] ? `cmd-${flat[activeIndex].id}` : undefined}
              role="combobox"
              aria-expanded="true"
              className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <kbd className="kbd hidden sm:inline-flex">Esc</kbd>
          </div>

          <div ref={listRef} id="command-list" role="listbox" className="max-h-[min(60vh,440px)] overflow-y-auto p-2">
            {flat.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="font-medium">{searchingAnimals ? 'Buscando…' : 'Sin resultados'}</p>
                <p className="text-sm text-muted-foreground">Intenta con otra palabra: nombre, raza, estado o ubicación.</p>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.name} role="group" aria-label={group.name} className="mb-1">
                  <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{group.name}</p>
                  {group.items.map((item) => {
                    const index = flat.indexOf(item);
                    const active = index === activeIndex;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        id={`cmd-${item.id}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        data-active={active}
                        onMouseMove={() => setActiveIndex(index)}
                        onClick={() => item.perform()}
                        className={cn(
                          'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                          active ? 'bg-primary/10 text-foreground' : 'text-foreground/90',
                        )}
                      >
                        {item.animal?.photo_webp ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.animal.photo_webp} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background transition-colors', active && 'border-primary/30 bg-primary text-primary-foreground')}>
                            <Icon className="h-4 w-4" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{item.label}</span>
                          {item.hint ? <span className="block truncate text-xs text-muted-foreground">{item.hint}</span> : null}
                        </span>
                        {item.animal ? <Badge variant={animalStatusVariant(item.animal.status)}>{item.animal.status}</Badge> : null}
                        {item.checked ? <Check className="h-4 w-4 text-primary" /> : null}
                        {item.shortcut ? (
                          <span className="hidden items-center gap-1 sm:flex">
                            {item.shortcut.map((key) => (
                              <kbd key={key} className="kbd">{key}</kbd>
                            ))}
                          </span>
                        ) : null}
                        {active ? <CornerDownLeft className="h-4 w-4 shrink-0 text-primary" /> : null}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-4 border-t bg-muted/40 px-4 py-2.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> navegar</span>
            <span className="flex items-center gap-1.5"><kbd className="kbd">↵</kbd> abrir</span>
            <span className="hidden items-center gap-1.5 sm:flex"><kbd className="kbd">G</kbd> + letra para saltar de sección</span>
            <span className="ml-auto flex items-center gap-1.5 font-medium">
              <PawPrint className="h-3.5 w-3.5 text-primary" /> Huellitas
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
