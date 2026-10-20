'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { userProfiles } from '@/lib/mock-data';
import { RoleGuard } from '@/components/role-guard';
import { useDemoValue } from '@/lib/demo-storage';

const roleStyles: Record<string, string> = {
  admin: 'bg-violet-100 text-violet-700',
  operador: 'bg-sky-100 text-sky-700',
  voluntario: 'bg-emerald-100 text-emerald-700',
};

export default function UsuariosPage() {
  const [users, setUsers] = useDemoValue('huellitas-demo-user-profiles', userProfiles);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ name: '', email: '', role: 'voluntario' });

  const inviteUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const role = invite.role as 'admin' | 'operador' | 'voluntario';
    setUsers((current) => [...current, {
      id: Math.max(0, ...current.map((user) => user.id)) + 1,
      name: invite.name.trim(),
      email: invite.email.trim().toLowerCase(),
      role,
      team: 'Por asignar',
      status: 'Invitación pendiente',
      location: 'Por asignar',
      permissions: role === 'admin' ? ['Administración'] : role === 'operador' ? ['Operación'] : ['Voluntariado'],
    }]);
    setInvite({ name: '', email: '', role: 'voluntario' });
    setInviteOpen(false);
  };

  return (
    <RoleGuard allowedRoles={['admin']}>
      <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-sky-700">Usuarios</p>
          <h1 className="text-3xl font-bold text-slate-900">Perfiles y permisos</h1>
        </div>
        <button onClick={() => { const opening = !inviteOpen; setInviteOpen(opening); if (!opening) setInvite({ name: '', email: '', role: 'voluntario' }); }} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700">
          {inviteOpen ? 'Cancelar' : '+ Invitar usuario'}
        </button>
      </div>

      {inviteOpen ? (
        <form onSubmit={inviteUser} className="grid gap-3 rounded-2xl border border-sky-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input required value={invite.name} onChange={(event) => setInvite((current) => ({ ...current, name: event.target.value }))} placeholder="Nombre completo" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input required type="email" value={invite.email} onChange={(event) => setInvite((current) => ({ ...current, email: event.target.value }))} placeholder="correo@ejemplo.org" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <select value={invite.role} onChange={(event) => setInvite((current) => ({ ...current, role: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option value="voluntario">Voluntario</option>
            <option value="operador">Operador</option>
            <option value="admin">Administrador</option>
          </select>
          <button className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white">Agregar a demo</button>
        </form>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {users.map((user) => (
          <div key={user.id} className="relative rounded-3xl border border-slate-200 bg-white p-5 pr-14 shadow-soft">
            <button type="button" aria-label={`Eliminar usuario ${user.name}`} onClick={() => setUsers((current) => current.filter((profile) => profile.id !== user.id))} className="absolute right-3 top-3 rounded-lg border border-rose-200 p-2 text-rose-700 hover:bg-rose-50">
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </button>
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-lg font-bold text-sky-700">
                {user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${roleStyles[user.role]}`}>
                {user.role}
              </span>
            </div>

            <div className="mt-4">
              <h2 className="text-lg font-bold text-slate-900">{user.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{user.email}</p>
            </div>

            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p><span className="font-semibold text-slate-800">Equipo:</span> {user.team}</p>
              <p><span className="font-semibold text-slate-800">Ubicación:</span> {user.location}</p>
              <p><span className="font-semibold text-slate-800">Estado:</span> {user.status}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {user.permissions.map((permission) => (
                <span key={permission} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700">
                  {permission}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
    </RoleGuard>
  );
}
