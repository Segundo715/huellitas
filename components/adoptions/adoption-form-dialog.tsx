'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import {
  ADOPTION_PRIORITIES,
  ADOPTION_SOURCES,
  ADOPTION_STAGES,
  HOUSING_TYPES,
  adoptionFormSchema,
  adoptionToForm,
  createAdoption,
  emptyAdoptionForm,
  updateAdoption,
  type AdoptionFormValues,
  type AdoptionRequest,
} from '@/lib/data/adoptions';
import type { Animal } from '@/lib/data/animals';
import { createClient } from '@/lib/supabase/client';

type FieldErrors = Partial<Record<keyof AdoptionFormValues, string>>;

const OTHER_ANIMAL = '__other__';

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs font-medium text-destructive">{message}</p> : null;
}

export function AdoptionFormDialog({
  open,
  onOpenChange,
  request,
  animals,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: AdoptionRequest | null;
  animals: Animal[];
  onSaved: (request: AdoptionRequest) => void;
}) {
  const [form, setForm] = useState<AdoptionFormValues>(emptyAdoptionForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [otherAnimal, setOtherAnimal] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(request ? adoptionToForm(request) : emptyAdoptionForm);
      setOtherAnimal(Boolean(request && !request.animal_id));
      setErrors({});
    }
  }, [open, request]);

  const set = (field: keyof AdoptionFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  // Solo se ofrecen animales que aún pueden adoptarse (y el ya vinculado, si lo hay).
  const selectableAnimals = animals.filter((animal) => animal.status !== 'Adoptado' || animal.id === form.animal_id);
  const animalChoice = otherAnimal ? OTHER_ANIMAL : form.animal_id;

  const chooseAnimal = (value: string) => {
    setOtherAnimal(value === OTHER_ANIMAL);
    if (value === OTHER_ANIMAL || value === '') {
      // Al pasar de un animal vinculado a "Otro" se limpia el nombre para escribir uno nuevo.
      setForm((current) => ({ ...current, animal_id: '', animal_name: value === OTHER_ANIMAL && !current.animal_id ? current.animal_name : '' }));
    } else {
      const animal = animals.find((item) => item.id === value);
      setForm((current) => ({ ...current, animal_id: value, animal_name: animal?.name ?? '' }));
    }
    setErrors((current) => ({ ...current, animal_name: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = adoptionFormSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof AdoptionFormValues;
        nextErrors[field] ??= issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const saved = request ? await updateAdoption(supabase, request.id, parsed.data) : await createAdoption(supabase, parsed.data);
      toast.success(request ? 'Solicitud actualizada' : `Solicitud de ${saved.applicant_name} registrada`);
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la solicitud.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{request ? `Solicitud de ${request.applicant_name}` : 'Nueva solicitud de adopción'}</DialogTitle>
          <DialogDescription>{request ? 'Actualiza los datos y la etapa del proceso.' : 'Registra a una persona interesada en adoptar.'}</DialogDescription>
        </DialogHeader>

        <form id="adoption-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="adoption-applicant">Solicitante *</Label>
            <Input id="adoption-applicant" value={form.applicant_name} onChange={(e) => set('applicant_name', e.target.value)} placeholder="Nombre completo" aria-invalid={Boolean(errors.applicant_name)} />
            <FieldError message={errors.applicant_name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adoption-email">Correo *</Label>
            <Input id="adoption-email" type="email" inputMode="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="nombre@correo.com" aria-invalid={Boolean(errors.email)} />
            <FieldError message={errors.email} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adoption-phone">Teléfono</Label>
            <Input id="adoption-phone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="55 1234 5678" aria-invalid={Boolean(errors.phone)} />
            <FieldError message={errors.phone} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adoption-animal">Animal de interés *</Label>
            <NativeSelect id="adoption-animal" value={animalChoice} onChange={(e) => chooseAnimal(e.target.value)} aria-invalid={Boolean(errors.animal_name)}>
              <option value="">Selecciona...</option>
              {selectableAnimals.map((animal) => (
                <option key={animal.id} value={animal.id}>
                  {animal.name} · {animal.type}{animal.status !== 'Disponible' ? ` (${animal.status})` : ''}
                </option>
              ))}
              <option value={OTHER_ANIMAL}>Otro / aún no decide</option>
            </NativeSelect>
            {animalChoice === OTHER_ANIMAL ? (
              <Input value={form.animal_name} onChange={(e) => set('animal_name', e.target.value)} placeholder="Ej. Cachorro mediano" aria-label="Nombre o descripción del animal" />
            ) : null}
            <FieldError message={errors.animal_name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adoption-city">Zona o ciudad</Label>
            <Input id="adoption-city" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Coyoacán" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adoption-housing">Vivienda</Label>
            <NativeSelect id="adoption-housing" value={form.housing} onChange={(e) => set('housing', e.target.value)}>
              {HOUSING_TYPES.map((option) => <option key={option}>{option}</option>)}
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adoption-source">¿Cómo nos conoció?</Label>
            <NativeSelect id="adoption-source" value={form.source} onChange={(e) => set('source', e.target.value)}>
              {ADOPTION_SOURCES.map((option) => <option key={option}>{option}</option>)}
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adoption-stage">Etapa</Label>
            <NativeSelect id="adoption-stage" value={form.stage} onChange={(e) => set('stage', e.target.value)}>
              {ADOPTION_STAGES.map((option) => <option key={option}>{option}</option>)}
            </NativeSelect>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adoption-priority">Prioridad</Label>
            <NativeSelect id="adoption-priority" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {ADOPTION_PRIORITIES.map((option) => <option key={option}>{option}</option>)}
            </NativeSelect>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="adoption-assignee">Responsable</Label>
            <Input id="adoption-assignee" value={form.assignee} onChange={(e) => set('assignee', e.target.value)} placeholder="Persona del equipo que da seguimiento" />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="adoption-notes">Notas</Label>
            <Textarea id="adoption-notes" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Experiencia con mascotas, horarios, acuerdos de la entrevista..." aria-invalid={Boolean(errors.notes)} />
            <FieldError message={errors.notes} />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="adoption-form" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            {saving ? 'Guardando...' : request ? 'Guardar cambios' : 'Registrar solicitud'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
