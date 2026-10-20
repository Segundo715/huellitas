'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Baby, Cat, Check, CheckCircle2, Dog, Gauge, Heart, HelpCircle, Hourglass, House, PawPrint, Loader2, Ruler, Scale, Send, Share2, ShieldCheck, Syringe, X } from 'lucide-react';
import { toast } from 'sonner';
import { AnimalCard, AnimalPhoto, FavoriteButton, SexIcon } from '@/components/public/animal-card';
import { FieldError } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { celebrate } from '@/lib/celebrate';
import {
  PUBLIC_HOUSING,
  ageGroup,
  ageGroupLabel,
  ageLabel,
  emptyPublicRequest,
  listAdoptableAnimals,
  publicRequestSchema,
  submitAdoptionRequest,
  type PublicAnimal,
  type PublicRequestValues,
} from '@/lib/data/public-adoption';
import { fieldErrors } from '@/lib/data/table-store';
import { createClient } from '@/lib/supabase/client';
import { useFavorites } from '@/lib/use-favorites';

type Errors = Partial<Record<keyof PublicRequestValues, string>>;

function Answer({ value }: { value: boolean | null | undefined }) {
  if (value == null) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground"><HelpCircle className="h-4 w-4" /> Por evaluar</span>
    );
  }
  return value ? (
    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400"><Check className="h-4 w-4" /> Sí</span>
  ) : (
    <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400"><X className="h-4 w-4" /> Mejor no</span>
  );
}

function RequestForm({ animal }: { animal: PublicAnimal }) {
  const [form, setForm] = useState<PublicRequestValues>(emptyPublicRequest);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');
  const sectionRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof PublicRequestValues>(field: K, value: PublicRequestValues[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setServerError('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = publicRequestSchema.safeParse(form);
    if (!parsed.success) {
      const found = fieldErrors<keyof PublicRequestValues>(parsed.error.issues);
      setErrors(found);
      const first = Object.keys(found)[0];
      if (first) document.getElementById(`req-${first}`)?.focus();
      return;
    }
    setSending(true);
    try {
      await submitAdoptionRequest(createClient(), animal, parsed.data);
      setSent(true);
      celebrate();
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'No pudimos enviar tu solicitud.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div ref={sectionRef} id="solicitud" className="scroll-mt-24 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100">
        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        <h3 className="mt-3 font-display text-2xl font-extrabold">¡Gracias, {form.name.split(' ')[0]}! <PawPrint aria-hidden="true" className="inline h-6 w-6 text-emerald-500" /></h3>
        <p className="mt-2">Recibimos tu solicitud para adoptar a {animal.name}. Esto es lo que sigue:</p>
        <ol className="mt-4 space-y-2 text-sm">
          <li><strong>1.</strong> Revisamos tu solicitud (1 a 3 días hábiles).</li>
          <li><strong>2.</strong> Te llamamos al {form.phone} para una breve entrevista.</li>
          <li><strong>3.</strong> Agendamos una visita para que conozcas a {animal.name} en persona.</li>
        </ol>
        <Button variant="outline" className="mt-5 bg-white/60 dark:bg-transparent" asChild>
          <Link href="/adopta#animales">Seguir viendo animales</Link>
        </Button>
      </div>
    );
  }

  return (
    <div ref={sectionRef} id="solicitud" className="scroll-mt-24 rounded-3xl border bg-card p-6 shadow-card">
      <h2 className="font-display text-2xl font-extrabold">Quiero adoptar a {animal.name}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Enviar la solicitud no te compromete. Te contactaremos para conocernos.</p>
      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2" noValidate>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="req-name">Nombre completo *</Label>
          <Input id="req-name" autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} aria-invalid={Boolean(errors.name)} />
          <FieldError message={errors.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="req-email">Correo *</Label>
          <Input id="req-email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} aria-invalid={Boolean(errors.email)} />
          <FieldError message={errors.email} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="req-phone">Teléfono / WhatsApp *</Label>
          <Input id="req-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="55 1234 5678" aria-invalid={Boolean(errors.phone)} />
          <FieldError message={errors.phone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="req-housing">Vivo en *</Label>
          <NativeSelect id="req-housing" value={form.housing} onChange={(e) => set('housing', e.target.value)} aria-invalid={Boolean(errors.housing)}>
            <option value="">Elige una opción</option>
            {PUBLIC_HOUSING.map((option) => <option key={option}>{option}</option>)}
          </NativeSelect>
          <FieldError message={errors.housing} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="req-city">Colonia o ciudad</Label>
          <Input id="req-city" autoComplete="address-level2" value={form.city} onChange={(e) => set('city', e.target.value)} />
          <FieldError message={errors.city} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="req-message">Cuéntanos de ti *</Label>
          <Textarea
            id="req-message"
            rows={4}
            value={form.message}
            onChange={(e) => set('message', e.target.value)}
            placeholder={`¿Quiénes viven en casa? ¿Tienes otras mascotas? ¿Por qué te gustaría adoptar a ${animal.name}?`}
            aria-invalid={Boolean(errors.message)}
          />
          <FieldError message={errors.message} />
        </div>
        {/* Campo trampa: invisible para personas, los bots suelen llenarlo. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="req-website">Sitio web</label>
          <input id="req-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set('website', e.target.value)} />
        </div>
        <label className="flex items-start gap-3 text-sm sm:col-span-2">
          <input
            id="req-accepted"
            type="checkbox"
            checked={form.accepted}
            onChange={(e) => set('accepted', e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
            aria-invalid={Boolean(errors.accepted)}
          />
          <span>
            Me comprometo a darle cuidados de por vida y acepto que el refugio me contacte y haga una visita de seguimiento.
            <FieldError message={errors.accepted} />
          </span>
        </label>
        {serverError ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:col-span-2">{serverError}</p> : null}
        <Button type="submit" size="lg" disabled={sending} className="sm:col-span-2">
          {sending ? <Loader2 className="animate-spin" /> : <Send />} {sending ? 'Enviando…' : 'Enviar solicitud'}
        </Button>
        <p className="text-center text-xs text-muted-foreground sm:col-span-2">Usamos tus datos solo para tu proceso de adopción.</p>
      </form>
    </div>
  );
}

export function AnimalProfile({ id }: { id: string }) {
  const [animals, setAnimals] = useState<PublicAnimal[] | null>(null);
  const [error, setError] = useState('');
  const favorites = useFavorites();

  useEffect(() => {
    listAdoptableAnimals(createClient())
      .then(setAnimals)
      .catch((err) => setError(err instanceof Error ? err.message : 'No pudimos cargar este perfil.'));
  }, []);

  const animal = animals?.find((a) => a.id === id) ?? null;
  const similar = useMemo(() => (animal && animals ? animals.filter((a) => a.id !== animal.id && a.type === animal.type && a.status === 'Disponible').slice(0, 3) : []), [animal, animals]);

  useEffect(() => {
    if (animal) document.title = `Adopta a ${animal.name} · Huellitas`;
  }, [animal]);

  const share = async () => {
    if (!animal) return;
    const url = window.location.href;
    const text = `${animal.name} busca hogar en Huellitas 🐾`;
    try {
      if (navigator.share) {
        await navigator.share({ title: text, text, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Enlace copiado. ¡Compártelo!');
      }
    } catch {
      // El usuario canceló el diálogo de compartir.
    }
  };

  if (error) {
    return <p role="alert" className="mx-auto my-16 max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>;
  }

  if (!animals) {
    return (
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-3xl" />
        <div className="space-y-4"><Skeleton className="h-12 w-2/3" /><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent text-accent-foreground"><House aria-hidden="true" className="h-8 w-8" /></span>
        <h1 className="mt-4 font-display text-3xl font-extrabold">¡Este peludo ya encontró hogar!</h1>
        <p className="mt-2 text-muted-foreground">O su perfil ya no está publicado. Hay muchos más esperando conocerte.</p>
        <Button className="mt-6" asChild><Link href="/adopta#animales">Ver animales en adopción</Link></Button>
      </div>
    );
  }

  const reserved = animal.status === 'Reservado';
  const group = ageGroup(animal);
  const facts = [
    { icon: Hourglass, label: 'Edad', value: `${ageLabel(animal.age_years)} · ${ageGroupLabel(group, animal.type)}` },
    { icon: Ruler, label: 'Tamaño', value: animal.size ?? 'Por definir' },
    { icon: Scale, label: 'Peso', value: animal.weight_kg ? `${animal.weight_kg} kg` : 'Por definir' },
    { icon: Gauge, label: 'Energía', value: animal.energy ?? 'Por definir' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-8 lg:pb-12">
      <Link href="/adopta#animales" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Todos los animales
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1.05fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative aspect-square overflow-hidden rounded-[2rem] border shadow-lift">
            <AnimalPhoto animal={animal} />
            {reserved ? <span className="absolute left-4 top-4 rounded-full bg-amber-400 px-3 py-1.5 text-sm font-bold text-[#0f172a] shadow">Adopción en proceso</span> : null}
            <FavoriteButton active={favorites.isFavorite(animal.id)} onToggle={() => favorites.toggle(animal.id)} name={animal.name} className="absolute right-4 top-4 h-12 w-12" />
          </div>
          <Button variant="outline" className="mt-4 w-full" onClick={() => void share()}>
            <Share2 /> Compartir a {animal.name}
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{animal.type === 'Gato' ? 'Gato' : animal.type === 'Perro' ? 'Perro' : animal.type} en adopción</p>
            <h1 className="mt-1 flex items-center gap-3 font-display text-5xl font-extrabold tracking-tight">
              {animal.name} <SexIcon sex={animal.sex} className="h-8 w-8" />
            </h1>
            <p className="mt-1 text-lg text-muted-foreground">{[animal.breed, animal.sex].filter(Boolean).join(' · ')}</p>
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-2xl border bg-card p-3 shadow-card">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</dt>
                <dd className="mt-1 text-sm font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="rounded-3xl border bg-card p-6 shadow-card">
            <h2 className="font-display text-xl font-bold">Su historia</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              {animal.public_description ?? `${animal.name} está esperando a su familia. Escríbenos y te contamos todo sobre su carácter.`}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border bg-card p-5 shadow-card">
              <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-primary" /> Salud</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2"><dt className="flex items-center gap-1.5"><Syringe className="h-4 w-4 text-muted-foreground" /> Vacunas</dt><dd><Answer value={animal.vaccinated} /></dd></div>
                <div className="flex justify-between gap-2"><dt className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-muted-foreground" /> Esterilizado</dt><dd>{animal.sterilized === false && group === 'Cachorro' ? <span className="text-muted-foreground">Al cumplir la edad</span> : <Answer value={animal.sterilized} />}</dd></div>
              </dl>
            </div>
            <div className="rounded-3xl border bg-card p-5 shadow-card">
              <h2 className="flex items-center gap-2 font-semibold"><Baby className="h-5 w-5 text-primary" /> Se lleva bien con</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2"><dt className="flex items-center gap-1.5"><Baby className="h-4 w-4 text-muted-foreground" /> Niños</dt><dd><Answer value={animal.good_with_kids} /></dd></div>
                <div className="flex justify-between gap-2"><dt className="flex items-center gap-1.5"><Dog className="h-4 w-4 text-muted-foreground" /> Perros</dt><dd><Answer value={animal.good_with_dogs} /></dd></div>
                <div className="flex justify-between gap-2"><dt className="flex items-center gap-1.5"><Cat className="h-4 w-4 text-muted-foreground" /> Gatos</dt><dd><Answer value={animal.good_with_cats} /></dd></div>
              </dl>
            </div>
          </div>

          {reserved ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
              <h2 className="font-display text-xl font-bold">{animal.name} ya tiene una familia en camino <Heart aria-hidden="true" className="inline h-5 w-5 fill-current text-amber-500" /></h2>
              <p className="mt-1 text-sm">Su adopción está en proceso. Si no se concreta, volverá a estar disponible aquí. Mientras tanto, ¡mira a sus compañeros!</p>
            </div>
          ) : (
            <RequestForm animal={animal} />
          )}
        </div>
      </div>

      {similar.length ? (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-extrabold">También buscan hogar</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((other) => (
              <AnimalCard key={other.id} animal={other} favorite={favorites.isFavorite(other.id)} onToggleFavorite={() => favorites.toggle(other.id)} />
            ))}
          </div>
        </section>
      ) : null}

      {!reserved ? (
        <div className="fixed inset-x-4 bottom-4 z-30 lg:hidden">
          <Button size="lg" className="w-full shadow-lift" asChild>
            <a href="#solicitud"><Send /> Quiero adoptar a {animal.name}</a>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
