'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Info, KeyRound, Loader2, MapPin, PencilLine, RefreshCw, Search, ShieldAlert, ShieldCheck, UserCog, UserX, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { FilterChip, PageHeader, StatCard } from '@/components/page-header';
import { EmptyState, ErrorBanner, FieldError } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { ALL_ROLES, type AppRole } from '@/lib/auth/roles';
import { PROFILE_STATUSES, profileFormSchema, profileStore, roleBadge, setUserRole, type Profile, type ProfileFormValues } from '@/lib/data/profiles';
import { fieldErrors } from '@/lib/data/table-store';
import { isDemoMode } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { CreateStaffDialog } from '@/components/create-staff-dialog';

const ROLE_HELP: Record<AppRole, string> = {
  admin: 'Acceso total, incluidos usuarios, finanzas y voluntariado.',
  operador: 'Gestiona animales, inventario, adopciones y finanzas.',
  moderador: 'Revisa reportes y contenido denunciado sin acceder a conversaciones no reportadas.',
  voluntario: 'Agenda, seguimiento, eventos, reportes y sus turnos.',
};

function ProfileDialog({ profile, isSelf, onOpenChange, onSaved }: { profile: Profile | null; isSelf: boolean; onOpenChange: (open: boolean) => void; onSaved: (profile: Profile) => void }) {
  const [form, setForm] = useState<ProfileFormValues>({ full_name: '', team: '', location: '', status: 'Activo' });
  const [role, setRole] = useState<AppRole | ''>('');
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormValues, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({ full_name: profile.full_name ?? '', team: profile.team ?? '', location: profile.location ?? '', status: (PROFILE_STATUSES as readonly string[]).includes(profile.status) ? (profile.status as ProfileFormValues['status']) : 'Activo' });
      setRole(profile.role ?? '');
      setErrors({});
    }
  }, [profile]);

  const set = (field: keyof ProfileFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;
    const parsed = profileFormSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors<keyof ProfileFormValues>(parsed.error.issues));
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      let saved = await profileStore.update(supabase, profile.id, parsed.data);
      const roleChanged = role && role !== profile.role;
      if (roleChanged) saved = await setUserRole(supabase, saved, role);
      toast.success(roleChanged ? `${saved.full_name ?? saved.email} ahora es ${roleBadge(role).label.toLowerCase()}` : 'Perfil actualizado', {
        description: roleChanged && !isDemoMode() ? 'Verá el cambio la próxima vez que inicie sesión.' : undefined,
      });
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(profile)} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription className="break-all">{profile?.email}</DialogDescription>
        </DialogHeader>
        <form id="profile-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pf-name">Nombre</Label>
            <Input id="pf-name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Nombre completo" />
            <FieldError message={errors.full_name} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pf-role">Rol</Label>
            <NativeSelect id="pf-role" value={role} onChange={(e) => setRole(e.target.value as AppRole)} disabled={isSelf}>
              {!profile?.role ? <option value="">Sin rol (no puede entrar)</option> : null}
              {ALL_ROLES.map((option) => <option key={option} value={option}>{roleBadge(option).label}</option>)}
            </NativeSelect>
            <p className="text-xs text-muted-foreground">{isSelf ? 'No puedes cambiar tu propio rol; pídeselo a otra persona de administración.' : role ? ROLE_HELP[role] : 'Asigna un rol para que pueda iniciar sesión.'}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pf-team">Equipo</Label>
            <Input id="pf-team" value={form.team} onChange={(e) => set('team', e.target.value)} placeholder="Ej. Cuidado animal" />
            <FieldError message={errors.team} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pf-location">Ubicación</Label>
            <Input id="pf-location" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Ciudad o zona" />
            <FieldError message={errors.location} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pf-status">Estado</Label>
            <NativeSelect id="pf-status" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {PROFILE_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </NativeSelect>
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button type="submit" form="profile-form" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : null} Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function initials(profile: Profile) {
  const source = profile.full_name || profile.email;
  return source.split(/[\s.@]+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join('');
}

export function UsersManager() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [roleFilter, setRoleFilter] = useState<'Todos' | AppRole | 'sin-rol'>('Todos');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProfiles(await profileStore.list(createClient()));
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const by = (role: AppRole) => profiles.filter((p) => p.role === role).length;
    return { admin: by('admin'), operador: by('operador'), voluntario: by('voluntario'), moderador: by('moderador'), none: profiles.filter((p) => !p.role).length };
  }, [profiles]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return profiles.filter((p) => {
      if (roleFilter === 'sin-rol' ? p.role : roleFilter !== 'Todos' && p.role !== roleFilter) return false;
      return !query || [p.email, p.full_name, p.team, p.location].some((v) => v?.toLowerCase().includes(query));
    });
  }, [profiles, roleFilter, search]);

  const isSelf = (profile: Profile) => profile.id === user?.id || profile.email.toLowerCase() === user?.email.toLowerCase();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Usuarios"
        title="Equipo y permisos"
        description="Quién tiene acceso al panel y con qué rol."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading} aria-label="Recargar">
              <RefreshCw className={loading ? 'animate-spin' : undefined} />
            </Button>
            <CreateStaffDialog onCreated={() => void load()} />
          </div>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
        <StatCard label="Administración" value={loading ? '—' : counts.admin} icon={ShieldCheck} tone="violet" />
        <StatCard label="Operadores" value={loading ? '—' : counts.operador} icon={UserCog} tone="sky" />
        <StatCard label="Moderadores" value={loading ? '—' : counts.moderador} icon={ShieldAlert} tone="rose" />
        <StatCard label="Voluntarios" value={loading ? '—' : counts.voluntario} icon={Users} tone="emerald" />
        <StatCard label="Sin rol" value={loading ? '—' : counts.none} icon={UserX} tone={counts.none ? 'amber' : 'slate'} hint={counts.none ? 'No pueden entrar todavía' : 'Todos asignados'} />
      </section>

      <div className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-sm text-sky-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">¿Cómo agrego a alguien?</p>
          <p className="mt-0.5">
            {isDemoMode()
              ? 'En modo demo los usuarios son de prueba. En modo real se crean en Supabase.'
              : 'Usa «Crear cuenta» para dar de alta a un operador, voluntario, moderador o administrador con correo y contraseña inicial. La persona puede cambiar su foto y nombre en Mi perfil.'}
          </p>
        </div>
      </div>

      {loadError ? <ErrorBanner message={loadError} /> : null}

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {(['Todos', ...ALL_ROLES, 'sin-rol'] as const).map((option) => (
              <FilterChip key={option} active={roleFilter === option} onClick={() => setRoleFilter(option)}>
                {option === 'Todos' ? 'Todos' : option === 'sin-rol' ? 'Sin rol' : roleBadge(option).label}
              </FilterChip>
            ))}
          </div>
          <div className="relative lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nombre o correo…" className="pl-9" aria-label="Buscar usuarios" />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}</div>
        ) : visible.length === 0 ? (
          <EmptyState icon={Users} title={profiles.length ? 'Sin resultados' : 'Aún no hay usuarios'} description={profiles.length ? 'Prueba con otro filtro.' : 'Crea las cuentas en Supabase y aparecerán aquí.'} />
        ) : (
          <ul className="stagger grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((profile) => {
              const badge = roleBadge(profile.role);
              const self = isSelf(profile);
              return (
                <li key={profile.id} className={cn('flex flex-col rounded-2xl border bg-card p-4 transition hover:shadow-card', !profile.role && 'border-amber-200')}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-sm font-bold text-white shadow-lg shadow-sky-500/20">{initials(profile)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-semibold">
                        <span className="truncate">{profile.full_name ?? 'Sin nombre'}</span>
                        {self ? <Badge variant="outline">Tú</Badge> : null}
                      </p>
                      <p className="truncate text-xs text-muted-foreground" title={profile.email}>{profile.email}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold', badge.className)}>
                      <KeyRound className="h-3 w-3" /> {badge.label}
                    </span>
                    {profile.status !== 'Activo' ? <Badge variant={profile.status === 'Inactivo' ? 'neutral' : 'warning'}>{profile.status}</Badge> : null}
                  </div>
                  <p className="mt-3 flex-1 text-xs text-muted-foreground">
                    {[profile.team, profile.location].filter(Boolean).length ? (
                      <>
                        {profile.team ?? ''}
                        {profile.team && profile.location ? ' · ' : ''}
                        {profile.location ? <><MapPin className="inline h-3 w-3" /> {profile.location}</> : null}
                      </>
                    ) : (
                      'Sin equipo asignado'
                    )}
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setEditing(profile)}>
                    <PencilLine /> {profile.role ? 'Editar' : 'Asignar rol'}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <ProfileDialog
        profile={editing}
        isSelf={editing ? isSelf(editing) : false}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={(saved) => setProfiles((current) => current.map((p) => (p.id === saved.id ? saved : p)))}
      />
    </div>
  );
}
