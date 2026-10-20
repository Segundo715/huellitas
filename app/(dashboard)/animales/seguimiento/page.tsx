'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { RoleGuard } from '@/components/role-guard';
import { useDemoValue } from '@/lib/demo-storage';

const careQueue = [
  { id: 1, name: 'Milo', task: 'Control de piel', status: 'Pendiente', time: 'Hoy, 10:30' },
  { id: 2, name: 'Luna', task: 'Vacuna anual', status: 'Programada', time: 'Mañana, 09:00' },
  { id: 3, name: 'Kiko', task: 'Revisión de peso', status: 'En curso', time: 'Hoy, 15:00' },
];

const healthScore = [
  { label: 'Vacunas al día', value: '92%' },
  { label: 'Tratamientos activos', value: '11' },
  { label: 'Riesgos bajos', value: '7' },
];

export default function SeguimientoPage() {
  const [reminders, setReminders] = useDemoValue('huellitas-demo-care-reminders', careQueue);
  const [formOpen, setFormOpen] = useState(false);
  const [newReminder, setNewReminder] = useState({ name: '', task: '', time: '' });

  const createReminder = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReminders((current) => [{ id: Date.now(), ...newReminder, status: 'Pendiente' }, ...current]);
    setNewReminder({ name: '', task: '', time: '' });
    setFormOpen(false);
  };

  return (
    <RoleGuard allowedRoles={['admin', 'operador', 'voluntario']}>
      <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-sky-700">Seguimiento</p>
        <h1 className="text-3xl font-bold text-slate-900">Control de bienestar</h1>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {healthScore.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Agenda de cuidado</h2>
          <button onClick={() => { const opening = !formOpen; setFormOpen(opening); if (!opening) setNewReminder({ name: '', task: '', time: '' }); }} className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white">{formOpen ? 'Cancelar' : '+ Nuevo recordatorio'}</button>
        </div>

        {formOpen ? (
          <form onSubmit={createReminder} className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
            <input required value={newReminder.name} onChange={(event) => setNewReminder((current) => ({ ...current, name: event.target.value }))} placeholder="Animal" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input required value={newReminder.task} onChange={(event) => setNewReminder((current) => ({ ...current, task: event.target.value }))} placeholder="Cuidado o tarea" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input required type="datetime-local" value={newReminder.time} onChange={(event) => setNewReminder((current) => ({ ...current, time: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <button className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white">Guardar recordatorio</button>
          </form>
        ) : null}

        <div className="space-y-3">
          {reminders.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-900">{item.name}</p>
                <p className="text-sm text-slate-500">{item.task}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  item.status === 'Pendiente' ? 'bg-amber-100 text-amber-700' :
                  item.status === 'Programada' ? 'bg-sky-100 text-sky-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>{item.status}</span>
                <span className="text-sm text-slate-500">{item.time}</span>
              </div>
              <button type="button" aria-label={`Eliminar recordatorio de ${item.name}`} onClick={() => setReminders((current) => current.filter((reminder) => reminder.id !== item.id))} className="self-end rounded-lg border border-rose-200 bg-white p-2 text-rose-700 hover:bg-rose-50 sm:self-auto">
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
    </RoleGuard>
  );
}
