'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { calendarEntries, taskQueue } from '@/lib/mock-data';
import { RoleGuard } from '@/components/role-guard';
import { useDemoValue } from '@/lib/demo-storage';
import { animals as initialAnimals } from '@/lib/mock-data';

type AgendaEntry = { id: number; title: string; date: string; time: string; type: string; assignee: string; status: string; animalId?: string };

export default function AgendaPage() {
  const [entries, setEntries] = useDemoValue<AgendaEntry[]>('huellitas-demo-calendar-entries', calendarEntries);
  const [animalRecords] = useDemoValue('huellitas-demo-animals', initialAnimals);
  const [formOpen, setFormOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({ title: '', date: '', time: '', type: 'Cita', assignee: '', animalId: '' });

  const createEntry = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEntries((current) => [...current, { ...newEntry, id: Date.now(), status: 'Programada' }].sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`)));
    setNewEntry({ title: '', date: '', time: '', type: 'Cita', assignee: '', animalId: '' });
    setFormOpen(false);
  };

  return (
    <RoleGuard allowedRoles={['admin', 'operador', 'voluntario']}>
      <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-violet-700">Agenda</p>
          <h1 className="text-3xl font-bold text-slate-900">Citas y tareas</h1>
        </div>
        <button onClick={() => { const opening = !formOpen; setFormOpen(opening); if (!opening) setNewEntry({ title: '', date: '', time: '', type: 'Cita', assignee: '', animalId: '' }); }} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700">
          {formOpen ? 'Cancelar' : '+ Nueva cita'}
        </button>
      </div>

      {formOpen ? (
        <form onSubmit={createEntry} className="grid gap-3 rounded-2xl border border-violet-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
          <input required value={newEntry.title} onChange={(event) => setNewEntry((current) => ({ ...current, title: event.target.value }))} placeholder="Asunto" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input required type="date" value={newEntry.date} onChange={(event) => setNewEntry((current) => ({ ...current, date: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input required type="time" value={newEntry.time} onChange={(event) => setNewEntry((current) => ({ ...current, time: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input required value={newEntry.assignee} onChange={(event) => setNewEntry((current) => ({ ...current, assignee: event.target.value }))} placeholder="Responsable" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <select aria-label="Vincular animal" value={newEntry.animalId} onChange={(event) => setNewEntry((current) => ({ ...current, animalId: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <option value="">Sin animal vinculado</option>
            {animalRecords.map((animal) => <option key={animal.id} value={animal.id}>{animal.name}</option>)}
          </select>
          <button className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white">Guardar en demo</button>
        </form>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-slate-900">Calendario</h2>

          <div className="mt-5 space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <span className="text-[10px] uppercase tracking-[0.12em]">{entry.date.slice(5,7)}</span>
                  <span className="text-lg font-bold">{entry.date.slice(8,10)}</span>
                </div>
                <div className="flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-semibold text-slate-900">{entry.title}</p>
                    <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-700">{entry.type}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span>{entry.time}</span>
                    <span>•</span>
                    <span>{entry.assignee}</span>
                    {entry.animalId ? <><span>•</span><span>{animalRecords.find((animal) => animal.id === entry.animalId)?.name ?? 'Animal eliminado'}</span></> : null}
                    <span>•</span>
                    <span>{entry.status}</span>
                  </div>
                </div>
                <button type="button" aria-label={`Eliminar ${entry.title}`} onClick={() => setEntries((current) => current.filter((item) => item.id !== entry.id))} className="rounded-lg border border-rose-200 bg-white p-2 text-rose-700 hover:bg-rose-50">
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-slate-900">Tareas pendientes</h2>
          <div className="mt-5 space-y-3">
            {taskQueue.map((task) => (
              <div key={task.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-900">{task.title}</p>
                <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                  <span>{task.due}</span>
                  <span>{task.owner}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
    </RoleGuard>
  );
}
