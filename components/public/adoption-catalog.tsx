'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, Baby, CalendarHeart, Cat, Dog, ClipboardCheck, FileText, Heart, Home, IdCard, MessageCircleQuestion, PawPrint, Search, ShieldCheck, Sparkles, Stethoscope, X } from 'lucide-react';
import { AnimatedNumber } from '@/components/animated-number';
import { AnimalCard } from '@/components/public/animal-card';
import { HeroCollage, PawTrail, PhotoMarquee, RotatingWord } from '@/components/public/hero-fx';
import { CountUp, Reveal, RevealHeading } from '@/components/public/reveal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { ANIMAL_SIZES } from '@/lib/data/animals';
import { ageGroup, getShelterStats, listAdoptableAnimals, type AgeGroup, type PublicAnimal, type ShelterStats } from '@/lib/data/public-adoption';
import { normalize } from '@/lib/navigation';
import { createClient } from '@/lib/supabase/client';
import { useFavorites } from '@/lib/use-favorites';
import { cn } from '@/lib/utils';

const SPECIES = [
  { value: 'todos', label: 'Todos', icon: PawPrint },
  { value: 'Perro', label: 'Perros', icon: Dog },
  { value: 'Gato', label: 'Gatos', icon: Cat },
] as const;

const AGE_FILTERS: { value: '' | AgeGroup; label: string }[] = [
  { value: '', label: 'Cualquier edad' },
  { value: 'Cachorro', label: 'Cachorros y gatitos' },
  { value: 'Joven', label: 'Jóvenes (1–3 años)' },
  { value: 'Adulto', label: 'Adultos' },
  { value: 'Senior', label: 'Seniors' },
];

const STEPS = [
  { icon: Heart, title: 'Elige', text: 'Explora los perfiles y guarda tus favoritos. Fíjate en su energía y con quién convive.' },
  { icon: FileText, title: 'Envía tu solicitud', text: 'Llena el formulario en su perfil. Toma 3 minutos y no te compromete a nada.' },
  { icon: CalendarHeart, title: 'Conócelo', text: 'Te llamamos para una breve entrevista y agendamos una visita al refugio.' },
  { icon: Home, title: 'Llévalo a casa', text: 'Firmamos el contrato de adopción y te acompañamos durante la adaptación.' },
];

const REQUIREMENTS = [
  { icon: IdCard, text: 'Ser mayor de edad y presentar identificación oficial.' },
  { icon: Home, text: 'Comprobante de domicilio y permiso para tener mascotas si rentas.' },
  { icon: Stethoscope, text: 'Compromiso de mantener sus vacunas y visitas al veterinario.' },
  { icon: ClipboardCheck, text: 'Aceptar una visita de seguimiento durante los primeros meses.' },
];

const FAQ = [
  { q: '¿Tiene algún costo adoptar?', a: 'Hay una cuota de recuperación que cubre parte de sus vacunas, desparasitación y esterilización. Te la explicamos en la entrevista; nunca será un obstáculo para una buena familia.' },
  { q: '¿Los animales están vacunados y esterilizados?', a: 'Sí, todos salen con sus vacunas al día y esterilizados. Los cachorros se van con su calendario de vacunas y el compromiso de esterilizarlos a la edad adecuada.' },
  { q: '¿Puedo adoptar si vivo en departamento?', a: 'Claro. Muchos de nuestros perros pequeños, seniors y casi todos los gatos se adaptan muy bien. En cada perfil verás su nivel de energía para elegir mejor.' },
  { q: '¿Cuánto tarda el proceso?', a: 'Normalmente entre una y dos semanas desde que envías la solicitud hasta que se va contigo a casa.' },
  { q: '¿Qué pasa si no se adapta?', a: 'Te acompañamos para resolverlo. Si de verdad no funciona, el animal regresa al refugio: nunca lo des en adopción por tu cuenta ni lo abandones.' },
];

const BAND_PAWS = [
  { top: '12%', left: '6%', size: 34, r: -20, delay: 0 },
  { top: '70%', left: '14%', size: 26, r: 15, delay: -3 },
  { top: '20%', left: '88%', size: 30, r: 25, delay: -5 },
  { top: '78%', left: '80%', size: 24, r: -10, delay: -2 },
];

const CTA_PAWS = [
  { top: '15%', left: '8%', r: -15, delay: 0 },
  { top: '65%', left: '88%', r: 20, delay: -3 },
  { top: '70%', left: '12%', r: 10, delay: -5 },
];

export function AdoptionCatalog() {
  const [animals, setAnimals] = useState<PublicAnimal[]>([]);
  const [stats, setStats] = useState<ShelterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [species, setSpecies] = useState<(typeof SPECIES)[number]['value']>('todos');
  const [size, setSize] = useState('');
  const [age, setAge] = useState<'' | AgeGroup>('');
  const [sex, setSex] = useState('');
  const [kids, setKids] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [search, setSearch] = useState('');
  const favorites = useFavorites();

  useEffect(() => {
    const supabase = createClient();
    listAdoptableAnimals(supabase)
      .then(setAnimals)
      .catch((err) => setError(err instanceof Error ? err.message : 'No pudimos cargar a los animales.'))
      .finally(() => setLoading(false));
    getShelterStats(supabase).then(setStats, () => setStats(null));
  }, []);

  const filtered = useMemo(() => {
    const query = normalize(search.trim());
    return animals.filter((animal) => {
      if (species !== 'todos' && animal.type !== species) return false;
      if (size && animal.size !== size) return false;
      if (age && ageGroup(animal) !== age) return false;
      if (sex && animal.sex !== sex) return false;
      if (kids && !animal.good_with_kids) return false;
      if (onlyFavorites && !favorites.ids.includes(animal.id)) return false;
      return !query || normalize([animal.name, animal.breed, animal.public_description].filter(Boolean).join(' ')).includes(query);
    });
  }, [animals, species, size, age, sex, kids, onlyFavorites, search, favorites.ids]);

  const activeFilters = Boolean(size || age || sex || kids || onlyFavorites || search || species !== 'todos');
  const clearFilters = () => {
    setSpecies('todos');
    setSize('');
    setAge('');
    setSex('');
    setKids(false);
    setOnlyFavorites(false);
    setSearch('');
  };

  const collage = animals.filter((a) => a.photo_webp && a.status === 'Disponible').slice(0, 4);
  const available = stats?.available ?? animals.filter((a) => a.status === 'Disponible').length;

  return (
    <>
      {/* Portada */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="animate-aurora absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-300/30 blur-3xl dark:bg-sky-500/15" />
          <div className="animate-aurora absolute -right-24 top-10 h-96 w-96 rounded-full bg-orange-300/30 blur-3xl [animation-delay:-8s] dark:bg-orange-500/10" />
          <div className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
        </div>
        <PawTrail />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[1.1fr_1fr]">
          <div className="animate-page min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Adopción responsable
            </p>
            <h1 className="mt-4 min-h-[4.3em] font-display sm:min-h-[3.3em] text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Tu nuevo
              <br />
              <RotatingWord />
              <br />
              te está esperando.
            </h1>
            <div className="mt-5"><PhotoMarquee animals={animals.filter((a) => a.photo_webp && a.status === 'Disponible')} /></div>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Perros y gatos rescatados, vacunados y llenos de amor buscan una familia. Conócelos, elige con calma y nosotros te acompañamos en todo el proceso.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <a href="#animales"><PawPrint /> Ver animales en adopción</a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#como-adoptar">¿Cómo funciona?</a>
              </Button>
            </div>
            <dl className="mt-8 flex flex-wrap gap-8">
              <div>
                <dt className="text-sm text-muted-foreground">Esperan un hogar</dt>
                <dd className="font-display text-3xl font-extrabold text-primary">{loading && !stats ? '—' : <AnimatedNumber value={available} />}</dd>
              </div>
              {stats?.adopted ? (
                <div>
                  <dt className="text-sm text-muted-foreground">Ya fueron adoptados</dt>
                  <dd className="font-display text-3xl font-extrabold text-emerald-600 dark:text-emerald-400"><AnimatedNumber value={stats.adopted} /></dd>
                </div>
              ) : null}
              {stats?.rescued ? (
                <div>
                  <dt className="text-sm text-muted-foreground">Rescatados</dt>
                  <dd className="font-display text-3xl font-extrabold"><AnimatedNumber value={stats.rescued} /></dd>
                </div>
              ) : null}
            </dl>
          </div>

          <HeroCollage animals={collage} />
        </div>
        <a href="#animales" className="mx-auto mb-4 hidden w-fit animate-bounce text-muted-foreground lg:block" aria-label="Bajar a los animales">
          <ArrowDown className="h-5 w-5" />
        </a>
      </section>

      {/* Catálogo */}
      <section id="animales" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <RevealHeading>Conócelos</RevealHeading>
            <Reveal delay={120}><p className="mt-1 text-muted-foreground">Filtra por lo que buscas y toca un perfil para ver su historia.</p></Reveal>
          </div>
          <div className="flex gap-2">
            {SPECIES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSpecies(option.value)}
                aria-pressed={species === option.value}
                className={cn(
                  'inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition active:scale-95',
                  species === option.value ? 'border-primary bg-primary text-primary-foreground shadow-glow' : 'bg-card hover:border-primary/40',
                )}
              >
                <option.icon aria-hidden="true" className="h-4 w-4" /> {option.label}
              </button>
            ))}
          </div>
        </div>

        <Reveal delay={150} className="mt-6 grid gap-3 rounded-3xl border bg-card p-4 shadow-card sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Busca por nombre o raza…" className="pl-9" aria-label="Buscar animales" />
          </div>
          <NativeSelect value={size} onChange={(e) => setSize(e.target.value)} aria-label="Tamaño">
            <option value="">Cualquier tamaño</option>
            {ANIMAL_SIZES.map((option) => <option key={option}>{option}</option>)}
          </NativeSelect>
          <NativeSelect value={age} onChange={(e) => setAge(e.target.value as '' | AgeGroup)} aria-label="Edad">
            {AGE_FILTERS.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}
          </NativeSelect>
          <NativeSelect value={sex} onChange={(e) => setSex(e.target.value)} aria-label="Sexo">
            <option value="">Hembra o macho</option>
            <option value="Hembra">Hembra</option>
            <option value="Macho">Macho</option>
          </NativeSelect>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
            <button type="button" onClick={() => setKids((v) => !v)} aria-pressed={kids} className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition', kids ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'hover:border-primary/40')}>
              <Baby className="h-3.5 w-3.5" /> Convive con niños
            </button>
            <button type="button" onClick={() => setOnlyFavorites((v) => !v)} aria-pressed={onlyFavorites} className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition', onlyFavorites ? 'border-rose-400 bg-rose-50 text-rose-600' : 'hover:border-primary/40')}>
              <Heart className={cn('h-3.5 w-3.5', onlyFavorites && 'fill-current')} /> Mis favoritos ({favorites.ids.length})
            </button>
            <span className="ml-auto text-sm text-muted-foreground" aria-live="polite">
              {loading ? 'Cargando…' : `${filtered.length} ${filtered.length === 1 ? 'animal' : 'animales'}`}
            </span>
            {activeFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}><X /> Limpiar</Button>
            ) : null}
          </div>
        </Reveal>

        {error ? (
          <p role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
        ) : loading ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] w-full rounded-3xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-3xl border border-dashed px-4 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><PawPrint aria-hidden="true" className="h-7 w-7" /></span>
            <p className="mt-3 font-semibold">{onlyFavorites ? 'Aún no guardas favoritos' : 'Nadie coincide con esa búsqueda'}</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{onlyFavorites ? 'Toca el corazón en un perfil para guardarlo aquí.' : animals.length ? 'Prueba quitando algún filtro: a veces el amigo ideal no es el que imaginabas.' : 'En este momento no hay animales publicados. Vuelve pronto.'}</p>
            {activeFilters ? <Button variant="outline" className="mt-4" onClick={clearFilters}>Ver a todos</Button> : null}
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((animal, index) => (
              <Reveal key={animal.id} delay={(index % 3) * 110} variant="zoom" className="h-full">
                <AnimalCard animal={animal} favorite={favorites.isFavorite(animal.id)} onToggleFavorite={() => favorites.toggle(animal.id)} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* Por qué adoptar */}
      <section className="relative overflow-hidden bg-sidebar text-white">
        <div aria-hidden="true" className="animate-aurora pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-sky-500/25 blur-3xl" />
        <div aria-hidden="true" className="animate-aurora pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-orange-400/20 blur-3xl [animation-delay:-9s]" />
        {BAND_PAWS.map((paw, i) => (
          <PawPrint key={i} aria-hidden="true" className="animate-float-paw absolute text-white" style={{ top: paw.top, left: paw.left, width: paw.size, height: paw.size, animationDelay: `${paw.delay}s`, ['--r' as string]: `${paw.r}deg`, ['--o' as string]: 0.12 }} />
        ))}
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">¿Por qué adoptar?</p>
            <h2 className="mx-auto mt-3 max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-4xl">
              Cuando adoptas, <span className="bg-gradient-to-r from-sky-300 via-violet-300 to-orange-300 bg-clip-text text-transparent">salvas dos vidas</span>.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-300">La de tu nuevo amigo, y la del siguiente animal que podremos rescatar de la calle con el lugar que deja libre.</p>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { label: 'esperan un hogar hoy', value: stats?.available ?? available, tone: 'text-sky-300' },
              { label: 'ya encontraron familia', value: stats?.adopted ?? 0, tone: 'text-emerald-300' },
              { label: 'animales rescatados', value: stats?.rescued ?? animals.length, tone: 'text-orange-300' },
            ].map((item, index) => (
              <Reveal key={item.label} delay={index * 140} variant="zoom" className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur">
                <CountUp value={item.value} className={cn('font-display text-5xl font-extrabold', item.tone)} />
                <p className="mt-1 text-sm text-slate-300">{item.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo adoptar */}
      <section id="como-adoptar" className="scroll-mt-20 border-y bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <RevealHeading center>Adoptar es sencillo</RevealHeading>
          <Reveal delay={120}><p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">Queremos que cada adopción sea para siempre, por eso te acompañamos paso a paso.</p></Reveal>
          <Reveal className="relative mt-10">
          <div aria-hidden="true" className="draw-line absolute left-[12%] right-[12%] top-12 hidden h-0.5 bg-gradient-to-r from-sky-400 via-violet-400 to-orange-400 [transition-duration:1.6s] lg:block" />
          <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <Reveal as="li" key={title} delay={index * 120} className="group relative rounded-3xl border bg-card p-6 shadow-card transition-shadow hover:shadow-lift">
                <span className="absolute right-5 top-4 font-display text-5xl font-extrabold text-muted/80 dark:text-white/5">{index + 1}</span>
                <div className="pop-in flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-lg shadow-sky-500/30 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </Reveal>
            ))}
          </ol>
          </Reveal>

          <Reveal className="mt-12 grid gap-6 rounded-3xl border bg-card p-6 shadow-card sm:p-8 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <ShieldCheck className="h-8 w-8 text-primary" />
              <h3 className="mt-3 font-display text-2xl font-bold">Requisitos</h3>
              <p className="mt-2 text-sm text-muted-foreground">Nada complicado: solo queremos asegurarnos de que el hogar sea seguro y para toda la vida.</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {REQUIREMENTS.map(({ icon: Icon, text }, index) => (
                <Reveal as="li" key={text} delay={200 + index * 120} variant="left" className="flex gap-3 text-sm">
                  <span className="pop-in flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Icon className="h-4 w-4" /></span>
                  <span className="pt-1.5">{text}</span>
                </Reveal>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section id="preguntas" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-14">
        <RevealHeading center>
          <MessageCircleQuestion className="mr-2 inline h-7 w-7 align-[-0.15em] text-primary" />Preguntas frecuentes
        </RevealHeading>
        <div className="mt-8 space-y-3">
          {FAQ.map(({ q, a }, index) => (
            <Reveal key={q} delay={index * 80}>
            <details className="group rounded-2xl border bg-card p-5 shadow-card open:shadow-lift">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {q}
                <span className="text-xl text-primary transition group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="faq-body mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </details>
            </Reveal>
          ))}
        </div>
        <Reveal variant="zoom" className="relative mt-10 overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-600 p-8 text-center text-white shadow-lift">
          {CTA_PAWS.map((paw, i) => (
            <PawPrint key={i} aria-hidden="true" className="animate-float-paw absolute h-7 w-7 text-white" style={{ top: paw.top, left: paw.left, animationDelay: `${paw.delay}s`, ['--r' as string]: `${paw.r}deg`, ['--o' as string]: 0.2 }} />
          ))}
          <div aria-hidden="true" className="animate-aurora pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
          <p className="font-display text-2xl font-extrabold">¿Listo para cambiar una vida?</p>
          <p className="mt-2 text-white/85">Cada adopción libera un lugar para rescatar a otro animal de la calle.</p>
          <Button size="lg" variant="secondary" className="mt-5" asChild>
            <a href="#animales"><Heart className="animate-[wiggle_1.4s_ease-in-out_infinite]" /> Encontrar a mi compañero</a>
          </Button>
        </Reveal>
      </section>
    </>
  );
}
