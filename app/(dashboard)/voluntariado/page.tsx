'use client';

import { useState } from 'react';
import { volunteerTeams } from '@/lib/mock-data';
import { RoleGuard } from '@/components/role-guard';
import { useDemoValue } from '@/lib/demo-storage';

type VolunteerShift = { id: number; volunteer: string; team: string; date: string; time: string };

const availability = [
  { label: 'Voluntarios activos', value: '48', tone: 'bg-sky-100 text-sky-700' },
  { label: 'Turnos cubiertos', value: '92%', tone: 'bg-emerald-100 text-emerald-700' },
  { label: 'Necesitan apoyo', value: '6', tone: 'bg-amber-100 text-amber-700' },
];

export default function VoluntariadoPage() {
  const [turns, setTurns] = useDemoValue<VolunteerShift[]>('huellitas-demo-volunteer-shifts', []);
  const [formOpen, setFormOpen] = useState(false);
  const [newShift, setNewShift] = useState({ volunteer: '', team: volunteerTeams[0].name, date: '', time: '' });

  const createShift = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTurns((current) => [{ ...newShift, id: Date.now() }, ...current]);
    setNewShift({ volunteer: '', team: volunteerTeams[0].name, date: '', time: '' });
    setFormOpen(false);
  };

  return (
    <RoleGuard allowedRoles={['admin', 'voluntario']}>
      <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-sky-700">Voluntariado</p>
          <h1 className="text-3xl font-bold text-slate-900">Equipo y turnos</h1>
        </div>
        <button onClick={() => { const opening = !formOpen; setFormOpen(opening); if (!opening) setNewShift({ volunteer: '', team: volunteerTeams[0].name, date: '', time: '' }); }} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700">
          {formOpen ? 'Cancelar' : '+ Crear turno'}
        </button>
      </div>

      {formOpen ? (
        <form onSubmit={createShift} className="grid gap-3 rounded-2xl border border-sky-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
          <input required value={newShift.volunteer} onChange={(event) => setNewShift((current) => ({ ...current, volunteer: event.target.value }))} placeholder="Voluntario responsable" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <select value={newShift.team} onChange={(event) => setNewShift((current) => ({ ...current, team: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
            {volunteerTeams.map((team) => <option key={team.name}>{team.name}</option>)}
          </select>
          <input required type="date" value={newShift.date} onChange={(event) => setNewShift((current) => ({ ...current, date: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input required type="time" value={newShift.time} onChange={(event) => setNewShift((current) => ({ ...current, time: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <button className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white">Guardar turno</button>
        </form>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        {availability.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className={`mb-3 h-2.5 w-14 rounded-full ${item.tone}`} />
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {volunteerTeams.map((team) => (
          <div key={team.name} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-sky-700">Equipo</p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">{team.name}</h2>
              </div>
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                {team.members} personas
              </span>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Próximo turno</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{team.nextShift}</p>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                <span>Cobertura</span>
                <span className="font-semibold text-slate-900">{team.occupancy}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-sky-500" style={{ width: `${team.occupancy}%` }} />
              </div>
            </div>
          </div>
        ))}
      </section>

      {turns.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-slate-900">Turnos creados en demo</h2>
          <div className="mt-4 space-y-3">
            {turns.map((shift) => (
              <div key={shift.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div><p className="font-semibold text-slate-900">{shift.volunteer} · {shift.team}</p><p className="text-sm text-slate-500">{shift.date} · {shift.time}</p></div>
                <button onClick={() => setTurns((current) => current.filter((item) => item.id !== shift.id))} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">Eliminar turno</button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
    </RoleGuard>
  );
}
