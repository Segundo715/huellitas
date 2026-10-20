'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { eventCalendar } from '@/lib/mock-data';
import { RoleGuard } from '@/components/role-guard';
import { useDemoValue } from '@/lib/demo-storage';

export default function EventosPage() {
  const [events, setEvents] = useDemoValue('huellitas-demo-events', eventCalendar);
  const [formOpen, setFormOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', type: 'Comunidad', time: '' });

  const createEvent = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const [year, month, day] = newEvent.date.split('-');
    setEvents((current) => [{ ...newEvent, date: `${day} ${new Date(Number(year), Number(month) - 1).toLocaleDateString('es-MX', { month: 'short' })}` }, ...current]);
    setNewEvent({ title: '', date: '', type: 'Comunidad', time: '' });
    setFormOpen(false);
  };

  return (
    <RoleGuard allowedRoles={['admin', 'operador', 'voluntario']}>
      <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-violet-700">Eventos</p>
          <h1 className="text-3xl font-bold text-slate-900">Agenda y actividades</h1>
        </div>
        <button onClick={() => { const opening = !formOpen; setFormOpen(opening); if (!opening) setNewEvent({ title: '', date: '', type: 'Comunidad', time: '' }); }} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700">
          {formOpen ? 'Cancelar' : '+ Nuevo evento'}
        </button>
      </div>

      {formOpen ? (
        <form onSubmit={createEvent} className="grid gap-3 rounded-2xl border border-violet-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
          <input required value={newEvent.title} onChange={(event) => setNewEvent((current) => ({ ...current, title: event.target.value }))} placeholder="Nombre del evento" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input required type="date" value={newEvent.date} onChange={(event) => setNewEvent((current) => ({ ...current, date: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input required value={newEvent.type} onChange={(event) => setNewEvent((current) => ({ ...current, type: event.target.value }))} placeholder="Tipo" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input required value={newEvent.time} onChange={(event) => setNewEvent((current) => ({ ...current, time: event.target.value }))} placeholder="Horario" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <button className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white">Guardar evento</button>
        </form>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {events.map((event) => (
          <div key={event.title} className="relative rounded-3xl border border-slate-200 bg-white p-4 pr-12 shadow-soft">
            <button type="button" aria-label={`Eliminar evento ${event.title}`} onClick={() => setEvents((current) => current.filter((item) => item.title !== event.title))} className="absolute right-3 top-3 rounded-lg border border-rose-200 p-2 text-rose-700 hover:bg-rose-50">
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </button>
            <div className="mb-4 flex h-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <span className="text-lg font-bold">{event.date.split(' ')[0]}</span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{event.type}</p>
            <h2 className="mt-2 text-lg font-bold text-slate-900">{event.title}</h2>
            <div className="mt-4 space-y-1 text-sm text-slate-600">
              <p>{event.date}</p>
              <p>{event.time}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
    </RoleGuard>
  );
}
