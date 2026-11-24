'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Camera, Loader2, Save, Users } from 'lucide-react';
import { toast } from 'sonner';
import { CreateStaffDialog } from '@/components/create-staff-dialog';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/auth-provider';
import { getRoleLabel } from '@/lib/auth/roles';
import { isDemoMode } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/client';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function initials(name: string) {
  return name.split(/[\s.@]+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join('');
}

export function ProfileSettings() {
  const { user, mode } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleFile = (selected: File | undefined) => {
    if (!selected) return;
    if (!ALLOWED_AVATAR_TYPES.includes(selected.type)) {
      toast.error('Usa una imagen JPG, PNG o WebP.');
      return;
    }
    if (selected.size > MAX_AVATAR_SIZE) {
      toast.error('La imagen debe pesar 2 MB o menos.');
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fullName = name.trim();
    if (!fullName || fullName.length > 120) {
      toast.error('Escribe un nombre de hasta 120 caracteres.');
      return;
    }
    if (isDemoMode()) {
      toast.error('El perfil editable está disponible al conectar Supabase y desactivar el modo demo.');
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      toast.error('Falta configurar la conexión de Supabase.');
      return;
    }

    setSaving(true);
    let uploadedPath: string | null = null;

    try {
      if (file) {
        const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
        uploadedPath = `${user.id}/avatar-${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from('staff-avatars')
          .upload(uploadedPath, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
      }

      const metadata = { full_name: fullName, ...(uploadedPath ? { avatar_path: uploadedPath } : {}) };
      const { error: updateError } = await supabase.auth.updateUser({ data: metadata });
      if (updateError) throw updateError;

      if (uploadedPath && user.avatarPath && user.avatarPath !== uploadedPath) {
        const { error: removeError } = await supabase.storage.from('staff-avatars').remove([user.avatarPath]);
        if (removeError) console.error('No se pudo borrar el avatar anterior:', removeError.message);
      }

      setFile(null);
      toast.success('Perfil actualizado');
    } catch (error) {
      if (uploadedPath) await supabase.storage.from('staff-avatars').remove([uploadedPath]);
      const message = error instanceof Error ? error.message : '';
      if (/bucket not found/i.test(message)) {
        toast.error('Falta crear el almacenamiento de fotos. Ejecuta supabase-profile-storage.sql en el SQL Editor de Supabase.');
      } else if (/row-level security|policy/i.test(message)) {
        toast.error('Supabase bloqueó la foto. Ejecuta supabase-profile-storage.sql para configurar los permisos del bucket.');
      } else {
        toast.error(message || 'No se pudo actualizar el perfil.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Cuenta</p>
        <h1 className="mt-1 font-display text-3xl font-bold">Mi perfil</h1>
        <p className="mt-2 text-sm text-muted-foreground">Actualiza tu nombre y foto de perfil.</p>
      </div>

      <Card className="p-5 sm:p-7">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <UserAvatar path={user.avatarPath} initials={initials(user.name)} className="h-24 w-24 text-2xl" />
            <div className="space-y-2">
              <Label htmlFor="profile-avatar">Foto de perfil</Label>
              <Input id="profile-avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handleFile(event.target.files?.[0])} disabled={mode !== 'supabase' || saving} className="max-w-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-xs file:font-semibold" />
              <p className="text-xs text-muted-foreground">JPG, PNG o WebP; máximo 2 MB. Se guarda en almacenamiento privado.</p>
              {file ? <p className="text-xs font-medium text-foreground">Seleccionada: {file.name}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="profile-name">Nombre</Label>
              <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Correo / usuario</Label>
              <Input id="profile-email" value={user.email} readOnly />
              <p className="text-xs text-muted-foreground">El correo se administra desde Supabase Auth.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-role">Rol</Label>
              <Input id="profile-role" value={getRoleLabel(user.role)} readOnly />
              <p className="text-xs text-muted-foreground">Solo otro administrador puede cambiarlo.</p>
            </div>
          </div>

          {mode === 'demo' ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Conecta Supabase y desactiva el modo demo para guardar cambios reales.</p> : null}

          <div className="flex justify-end border-t pt-5">
            <Button type="submit" disabled={saving || mode !== 'supabase'}>
              {saving ? <Loader2 className="animate-spin" /> : file ? <Camera /> : <Save />}
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </Card>

      {user.role === 'admin' ? (
        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold">Administrar equipo</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Solo administración puede crear cuentas y asignar roles de admin, operador, moderador o voluntario.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/usuarios">Gestionar roles</Link>
            </Button>
            <CreateStaffDialog onCreated={() => undefined} />
          </div>
          {isDemoMode() ? <p className="text-xs text-amber-700 sm:basis-full">Desactiva el modo demo para crear cuentas reales.</p> : null}
        </Card>
      ) : null}
    </div>
  );
}
