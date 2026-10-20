'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, Loader2, PawPrint, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import {
  ANIMAL_SEXES,
  ANIMAL_STATUSES,
  ANIMAL_TYPES,
  animalFormSchema,
  animalToForm,
  createAnimal,
  emptyAnimalForm,
  updateAnimal,
  type Animal,
  type AnimalFormValues,
} from '@/lib/data/animals';
import { compressImageToWebp } from '@/lib/image-compression';
import { createClient } from '@/lib/supabase/client';

type FieldErrors = Partial<Record<keyof AnimalFormValues, string>>;

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs font-medium text-destructive">{message}</p> : null;
}

export function AnimalFormDialog({
  open,
  onOpenChange,
  animal,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animal: Animal | null;
  onSaved: (animal: Animal) => void;
}) {
  const [form, setForm] = useState<AnimalFormValues>(emptyAnimalForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(animal ? animalToForm(animal) : emptyAnimalForm);
      setErrors({});
    }
  }, [open, animal]);

  const set = (field: keyof AnimalFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handlePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setProcessingPhoto(true);
    try {
      set('photo_webp', await compressImageToWebp(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo procesar la imagen.');
    } finally {
      setProcessingPhoto(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = animalFormSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof AnimalFormValues;
        nextErrors[field] ??= issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const saved = animal ? await updateAnimal(supabase, animal.id, parsed.data) : await createAnimal(supabase, parsed.data);
      toast.success(animal ? `Expediente de ${saved.name} actualizado` : `${saved.name} registrado`);
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el expediente.');
    } finally {
      setSaving(false);
    }
  };

  const photoKb = form.photo_webp ? Math.round((form.photo_webp.length * 0.75) / 1024) : 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{animal ? `Editar a ${animal.name}` : 'Nuevo ingreso'}</DialogTitle>
          <DialogDescription>{animal ? 'Actualiza los datos del expediente.' : 'Registra un animal que acaba de llegar al refugio.'}</DialogDescription>
        </DialogHeader>

        <form id="animal-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="flex items-center gap-4 sm:col-span-2">
            <div className="relative">
              {form.photo_webp ? (
                <Image src={form.photo_webp} alt="Vista previa" width={80} height={80} unoptimized className="h-20 w-20 rounded-2xl border object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                  <PawPrint aria-hidden="true" className="h-8 w-8" />
                </div>
              )}
              {form.photo_webp ? (
                <button
                  type="button"
                  onClick={() => set('photo_webp', '')}
                  className="absolute -right-2 -top-2 rounded-full border bg-background p-1 text-muted-foreground shadow hover:text-destructive"
                  aria-label="Quitar foto"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Button type="button" variant="outline" size="sm" asChild>
                <label htmlFor="animal-photo" className="cursor-pointer">
                  {processingPhoto ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                  {processingPhoto ? 'Optimizando...' : form.photo_webp ? 'Cambiar foto' : 'Subir foto'}
                </label>
              </Button>
              <input id="animal-photo" type="file" accept="image/*" onChange={handlePhoto} disabled={processingPhoto} className="sr-only" />
              <p className="text-xs text-muted-foreground">{photoKb ? `WebP optimizado · ${photoKb} KB` : 'JPG, PNG o WebP. Se optimiza a máx. 320 KB.'}</p>
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="animal-name">Nombre *</Label>
            <Input id="animal-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej. Luna" aria-invalid={Boolean(errors.name)} />
            <FieldError message={errors.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="animal-type">Especie</Label>
            <NativeSelect id="animal-type" value={form.type} onChange={(e) => set('type', e.target.value)}>
              {ANIMAL_TYPES.map((option) => <option key={option}>{option}</option>)}
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <Label htmlFor="animal-breed">Raza</Label>
            <Input id="animal-breed" value={form.breed} onChange={(e) => set('breed', e.target.value)} placeholder="Mestiza" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="animal-age">Edad (años)</Label>
            <Input id="animal-age" type="number" min="0" step="0.1" inputMode="decimal" value={form.age_years} onChange={(e) => set('age_years', e.target.value)} aria-invalid={Boolean(errors.age_years)} />
            <FieldError message={errors.age_years} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="animal-weight">Peso (kg)</Label>
            <Input id="animal-weight" type="number" min="0" step="0.1" inputMode="decimal" value={form.weight_kg} onChange={(e) => set('weight_kg', e.target.value)} placeholder="18.5" aria-invalid={Boolean(errors.weight_kg)} />
            <FieldError message={errors.weight_kg} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="animal-sex">Sexo</Label>
            <NativeSelect id="animal-sex" value={form.sex} onChange={(e) => set('sex', e.target.value)}>
              {ANIMAL_SEXES.map((option) => <option key={option}>{option}</option>)}
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <Label htmlFor="animal-status">Estado</Label>
            <NativeSelect id="animal-status" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {ANIMAL_STATUSES.map((option) => <option key={option}>{option}</option>)}
            </NativeSelect>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="animal-location">Ubicación</Label>
            <Input id="animal-location" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Área A / Sala 1" />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="animal-notes">Notas</Label>
            <Textarea id="animal-notes" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Comportamiento, alimentación, cuidados especiales..." aria-invalid={Boolean(errors.notes)} />
            <FieldError message={errors.notes} />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="animal-form" disabled={saving || processingPhoto}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            {saving ? 'Guardando...' : animal ? 'Guardar cambios' : 'Registrar animal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
