'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Cat, Check, Dog, Home, ImagePlus, Loader2, Mail, MapPin, MessageCircle, MoreHorizontal, PawPrint, PencilLine, Phone, Plus, RefreshCw, RotateCcw, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { FilterChip, PageHeader, StatCard } from '@/components/page-header';
import { EmptyState, ErrorBanner, FieldError } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { compressImageToWebp } from '@/lib/image-compression';
import { LISTING_PET_TYPES, emptyListingForm, listingFormSchema, listingStatusVariant, listingStore, listingToForm, type AdoptionListing, type ListingFormValues } from '@/lib/data/listings';
import { timeAgo } from '@/lib/data/reports';
import { fieldErrors } from '@/lib/data/table-store';
import { celebrateFrom } from '@/lib/celebrate';
import { createClient } from '@/lib/supabase/client';
import { useCreateParam } from '@/lib/use-create-param';

type Errors = Partial<Record<keyof ListingFormValues, string>>;
const VIEWS = ['Pendientes', 'Aprobadas', 'Rechazadas', 'Todas'] as const;
const viewStatus: Record<(typeof VIEWS)[number], string | null> = { Pendientes: 'Pendiente', Aprobadas: 'Aprobada', Rechazadas: 'Rechazada', Todas: null };

function ListingFormDialog({ open, onOpenChange, listing, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; listing: AdoptionListing | null; onSaved: (listing: AdoptionListing) => void }) {
  const [form, setForm] = useState<ListingFormValues>(emptyListingForm);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(listing ? listingToForm(listing) : emptyListingForm);
      setErrors({});
    }
  }, [open, listing]);

  const set = (field: keyof ListingFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    setProcessing(true);
    try {
      set('photo_webp', await compressImageToWebp(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo procesar la imagen.');
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = listingFormSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors<keyof ListingFormValues>(parsed.error.issues));
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const saved = listing ? await listingStore.update(supabase, listing.id, parsed.data) : await listingStore.create(supabase, { ...parsed.data, status: 'Pendiente' });
      toast.success(listing ? 'Publicación actualizada' : `Publicación de ${saved.pet_name} lista para revisar`);
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{listing ? `Editar publicación de ${listing.pet_name}` : 'Nueva publicación particular'}</DialogTitle>
          <DialogDescription>Una persona busca hogar para su mascota. Quedará pendiente hasta que el equipo la apruebe.</DialogDescription>
        </DialogHeader>
        <form id="listing-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="flex items-center gap-4 sm:col-span-2">
            {form.photo_webp ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.photo_webp} alt="Vista previa" className="h-20 w-20 rounded-2xl border object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed bg-muted/40 text-muted-foreground"><PawPrint className="h-7 w-7" /></div>
            )}
            <div className="flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => void handlePhoto(e.target.files?.[0])} aria-label="Subir foto de la mascota" />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={processing}>
                {processing ? <Loader2 className="animate-spin" /> : <ImagePlus />} {processing ? 'Optimizando…' : form.photo_webp ? 'Cambiar foto' : 'Subir foto'}
              </Button>
              {form.photo_webp ? <Button type="button" variant="ghost" size="sm" onClick={() => set('photo_webp', '')}><X /> Quitar</Button> : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lis-pet">Mascota *</Label>
            <Input id="lis-pet" value={form.pet_name} onChange={(e) => set('pet_name', e.target.value)} placeholder="Nombre" aria-invalid={Boolean(errors.pet_name)} />
            <FieldError message={errors.pet_name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lis-type">Especie</Label>
            <NativeSelect id="lis-type" value={form.pet_type} onChange={(e) => set('pet_type', e.target.value)}>
              {LISTING_PET_TYPES.map((type) => <option key={type}>{type}</option>)}
            </NativeSelect>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="lis-motive">Motivo y descripción *</Label>
            <Textarea id="lis-motive" rows={3} value={form.motive} onChange={(e) => set('motive', e.target.value)} placeholder="Por qué busca hogar, carácter, vacunas…" aria-invalid={Boolean(errors.motive)} />
            <FieldError message={errors.motive} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lis-owner">Quién publica *</Label>
            <Input id="lis-owner" value={form.owner_name} onChange={(e) => set('owner_name', e.target.value)} placeholder="Nombre del dueño" aria-invalid={Boolean(errors.owner_name)} />
            <FieldError message={errors.owner_name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lis-location">Zona</Label>
            <Input id="lis-location" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Colonia o ciudad" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lis-phone">Teléfono</Label>
            <Input id="lis-phone" type="tel" inputMode="tel" value={form.owner_phone} onChange={(e) => set('owner_phone', e.target.value)} placeholder="55 1234 5678" aria-invalid={Boolean(errors.owner_phone)} />
            <FieldError message={errors.owner_phone} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lis-email">Correo</Label>
            <Input id="lis-email" type="email" inputMode="email" value={form.owner_email} onChange={(e) => set('owner_email', e.target.value)} placeholder="correo@ejemplo.com" aria-invalid={Boolean(errors.owner_email)} />
            <FieldError message={errors.owner_email} />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="listing-form" disabled={saving || processing}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            {listing ? 'Guardar cambios' : 'Crear publicación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function whatsappLink(phone: string) {
  const digits = phone.replace(/\D/g, '');
  // Números mexicanos de 10 dígitos: se antepone la lada del país.
  return `https://wa.me/${digits.length === 10 ? `52${digits}` : digits}`;
}

export function ListingsManager() {
  const [listings, setListings] = useState<AdoptionListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [view, setView] = useState<(typeof VIEWS)[number]>('Pendientes');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdoptionListing | null>(null);
  const [deleting, setDeleting] = useState<AdoptionListing | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setListings(await listingStore.list(createClient()));
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar las publicaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => ({
    Pendiente: listings.filter((l) => l.status === 'Pendiente').length,
    Aprobada: listings.filter((l) => l.status === 'Aprobada').length,
    Rechazada: listings.filter((l) => l.status === 'Rechazada').length,
  }), [listings]);

  const visible = listings.filter((listing) => !viewStatus[view] || listing.status === viewStatus[view]);

  const upsert = (saved: AdoptionListing) => setListings((current) => (current.some((l) => l.id === saved.id) ? current.map((l) => (l.id === saved.id ? saved : l)) : [saved, ...current]));

  const review = async (listing: AdoptionListing, status: string) => {
    setBusyId(listing.id);
    try {
      const saved = await listingStore.update(createClient(), listing.id, { status, reviewed_at: status === 'Pendiente' ? null : new Date().toISOString() });
      upsert(saved);
      toast.success(status === 'Aprobada' ? `${listing.pet_name} aprobada para publicarse` : status === 'Rechazada' ? `Publicación de ${listing.pet_name} rechazada` : 'Decisión revertida');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await listingStore.remove(createClient(), deleting.id);
      setListings((current) => current.filter((l) => l.id !== deleting.id));
      toast.success('Publicación eliminada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar.');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  useCreateParam(openCreate);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Adopciones particulares"
        title="Moderación de publicaciones"
        description="Personas que buscan un nuevo hogar para su mascota. Revisa cada caso antes de publicarlo."
        actions={
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading} aria-label="Recargar">
              <RefreshCw className={loading ? 'animate-spin' : undefined} />
            </Button>
            <Button onClick={openCreate}><Plus /> Nueva publicación</Button>
          </>
        }
      />

      <section className="stagger grid grid-cols-3 gap-3 lg:gap-4">
        <StatCard label="Por revisar" value={loading ? '—' : counts.Pendiente} icon={Home} tone="amber" />
        <StatCard label="Aprobadas" value={loading ? '—' : counts.Aprobada} icon={Check} tone="emerald" />
        <StatCard label="Rechazadas" value={loading ? '—' : counts.Rechazada} icon={X} tone="slate" />
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {VIEWS.map((option) => <FilterChip key={option} active={view === option} onClick={() => setView(option)}>{option}</FilterChip>)}
      </div>

      {loadError ? <ErrorBanner message={loadError} /> : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-2xl" />)}</div>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState icon={Home} title={listings.length ? 'Nada en esta vista' : 'Sin publicaciones'} description={view === 'Pendientes' && listings.length ? 'No hay publicaciones esperando revisión. ¡Todo al día!' : 'Registra la primera solicitud que reciba el refugio.'} action={<Button onClick={openCreate}><Plus /> Nueva publicación</Button>} />
        </Card>
      ) : (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((listing) => {
            const Icon = listing.pet_type === 'Gato' ? Cat : listing.pet_type === 'Perro' ? Dog : PawPrint;
            const busy = busyId === listing.id;
            return (
              <article key={listing.id} className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
                <div className="relative h-44 overflow-hidden">
                  {listing.photo_webp ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={listing.photo_webp} alt={listing.pet_name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-sky-100 via-indigo-50 to-orange-100 text-primary dark:from-sky-500/10 dark:via-indigo-500/10 dark:to-orange-500/10">
                      <Icon className="h-14 w-14 opacity-70" />
                    </div>
                  )}
                  <Badge variant={listingStatusVariant(listing.status)} className="absolute left-3 top-3 shadow-sm">{listing.status}</Badge>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="absolute right-3 top-3 h-8 w-8 opacity-90 shadow-sm" aria-label={`Acciones para ${listing.pet_name}`}><MoreHorizontal /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => { setEditing(listing); setFormOpen(true); }}><PencilLine /> Editar</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => setDeleting(listing)} className="text-destructive focus:bg-rose-50 focus:text-destructive"><Trash2 /> Eliminar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-xl font-bold">{listing.pet_name}</h3>
                    <span className="text-xs text-muted-foreground">{timeAgo(listing.created_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{listing.pet_type}{listing.location ? <> · <MapPin className="inline h-3 w-3" /> {listing.location}</> : null}</p>
                  <p className="mt-3 line-clamp-4 text-sm">{listing.motive}</p>
                  <div className="mt-4 space-y-1 rounded-xl bg-muted/60 p-3 text-xs">
                    <p className="font-semibold">{listing.owner_name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                      {listing.owner_phone ? (
                        <>
                          <a href={`tel:${listing.owner_phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 hover:text-primary"><Phone className="h-3 w-3" /> {listing.owner_phone}</a>
                          <a href={whatsappLink(listing.owner_phone)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline"><MessageCircle className="h-3 w-3" /> WhatsApp</a>
                        </>
                      ) : null}
                      {listing.owner_email ? <a href={`mailto:${listing.owner_email}`} className="inline-flex items-center gap-1 hover:text-primary"><Mail className="h-3 w-3" /> {listing.owner_email}</a> : null}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2 pt-1">
                    {listing.status === 'Pendiente' ? (
                      <>
                        <Button className="flex-1" onClick={(event) => { celebrateFrom(event.currentTarget, 14); void review(listing, 'Aprobada'); }} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Check />} Aprobar</Button>
                        <Button variant="outline" className="flex-1" onClick={() => void review(listing, 'Rechazada')} disabled={busy}><X /> Rechazar</Button>
                      </>
                    ) : (
                      <Button variant="outline" className="flex-1" onClick={() => void review(listing, 'Pendiente')} disabled={busy}>
                        {busy ? <Loader2 className="animate-spin" /> : <RotateCcw />} Volver a revisión
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ListingFormDialog open={formOpen} onOpenChange={setFormOpen} listing={editing} onSaved={upsert} />
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`¿Eliminar la publicación de ${deleting?.pet_name ?? ''}?`}
        description="Se borrará junto con los datos de contacto. Esta acción no se puede deshacer."
        onConfirm={handleDelete}
      />
    </div>
  );
}
