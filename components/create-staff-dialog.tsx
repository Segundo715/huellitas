'use client';

import { useState } from 'react';
import { createClient as createAuthClient } from '@supabase/supabase-js';
import { Clipboard, Loader2, RefreshCw, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { ALL_ROLES, type AppRole } from '@/lib/auth/roles';
import { roleBadge } from '@/lib/data/profiles';
import { getSupabasePublicConfig, isDemoMode } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';

export function CreateStaffDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AppRole>('operador');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('operador');
  };

  const generatePassword = () => {
    setPassword(`${crypto.randomUUID()}aA7!`);
  };

  const handleOpenChange = (next: boolean) => {
    if (saving) return;
    if (next && !password) generatePassword();
    setOpen(next);
  };

  const copyPassword = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      toast.success('Contraseña copiada');
    } catch {
      toast.error('No se pudo copiar. Selecciona la contraseña y cópiala manualmente.');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isDemoMode()) {
      toast.error('Desactiva el modo demo para crear cuentas reales.');
      return;
    }

    const config = getSupabasePublicConfig();
    const adminClient = createClient();
    if (!config || !adminClient) {
      toast.error('Falta configurar la conexión de Supabase.');
      return;
    }

    setSaving(true);
    const authClient = createAuthClient(config.url, config.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    try {
      const { data, error } = await authClient.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: name.trim() } },
      });

      if (error) throw error;
      if (!data.user) throw new Error('Supabase no devolvió la cuenta creada.');
      if (data.user.identities?.length === 0) throw new Error('Ya existe una cuenta con ese correo.');

      const { error: roleError } = await adminClient.rpc('set_user_role', {
        target_email: email.trim().toLowerCase(),
        new_role: role,
      });

      if (roleError) {
        throw new Error(`La cuenta se creó, pero no se pudo asignar el rol: ${roleError.message}`);
      }

      toast.success('Cuenta creada', {
        description: `Se asignó el rol ${roleBadge(role).label}. Si Supabase requiere confirmación por correo, la persona deberá confirmarlo antes de iniciar sesión.`,
      });
      reset();
      setOpen(false);
      onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear la cuenta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button onClick={() => handleOpenChange(true)} disabled={isDemoMode()}>
        <UserPlus /> Crear cuenta
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear cuenta del equipo</DialogTitle>
            <DialogDescription>La persona podrá iniciar sesión con su correo y esta contraseña. El rol se guarda de forma segura en Supabase Auth.</DialogDescription>
          </DialogHeader>
          <form id="create-staff-form" onSubmit={handleSubmit} className="grid gap-4" autoComplete="off">
            <div className="space-y-2">
              <Label htmlFor="staff-name">Nombre</Label>
              <Input id="staff-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={120} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-email">Correo / usuario</Label>
              <Input id="staff-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-password">Contraseña temporal</Label>
              <div className="flex gap-2">
                <Input id="staff-password" type="text" value={password} readOnly autoComplete="off" required className="font-mono" />
                <Button type="button" variant="outline" size="icon" onClick={copyPassword} aria-label="Copiar contraseña" title="Copiar contraseña">
                  <Clipboard />
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={generatePassword} aria-label="Generar otra contraseña" title="Generar otra contraseña">
                  <RefreshCw />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Cópiala antes de crear la cuenta y entrégala por un canal privado.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-role">Rol</Label>
              <NativeSelect id="staff-role" value={role} onChange={(event) => setRole(event.target.value as AppRole)}>
                {ALL_ROLES.map((option) => <option key={option} value={option}>{roleBadge(option).label}</option>)}
              </NativeSelect>
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" form="create-staff-form" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <UserPlus />}
              Crear cuenta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}