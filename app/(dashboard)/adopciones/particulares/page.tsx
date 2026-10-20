'use client';

import { useState } from 'react';
import { PawPrint } from 'lucide-react';
import { adoptionListings } from '@/lib/mock-data';
import { RoleGuard } from '@/components/role-guard';
import { useDemoValue } from '@/lib/demo-storage';

export default function AdopcionesParticularesPage() {
  const [statuses, setStatuses] = useDemoValue<Record<number, 'Pendiente' | 'Aprobada' | 'Rechazada'>>('huellitas-demo-listing-statuses', {});

  const setListingStatus = (id: number, status: 'Aprobada' | 'Rechazada') => {
    setStatuses((current) => ({ ...current, [id]: status }));
  };

  return (
    <RoleGuard allowedRoles={['admin', 'operador']}>
      <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-brand-primary">Particulares</p>
        <h1 className="text-3xl font-bold text-brand-text">Moderación de adopciones</h1>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {adoptionListings.map((item) => (
          <div key={item.id} className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-soft">
            <div className="flex h-40 items-center justify-center bg-gradient-to-br from-brand-soft via-white to-sky-100 text-brand-primary">
              <PawPrint aria-hidden="true" className="h-14 w-14" />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-brand-text">{item.pet}</h3>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${statuses[item.id] === 'Aprobada' ? 'bg-emerald-100 text-emerald-700' : statuses[item.id] === 'Rechazada' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{statuses[item.id] ?? 'Pendiente'}</span>
              </div>
              <p className="mt-2 text-sm text-brand-muted">Ubicación: {item.location}</p>
              <p className="mt-1 text-sm text-brand-muted">Dueño: {item.name}</p>
              <p className="mt-3 text-sm text-brand-text">Motivo: {item.motive}</p>
              <div className="mt-4 flex gap-2">
                {statuses[item.id] ? (
                  <button onClick={() => setStatuses((current) => { const next = { ...current }; delete next[item.id]; return next; })} className="flex-1 rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-semibold text-brand-text">Revertir decisión demo</button>
                ) : (
                  <>
                    <button onClick={() => setListingStatus(item.id, 'Aprobada')} className="flex-1 rounded-xl bg-brand-primary px-3 py-2 text-sm font-semibold text-white">Aprobar</button>
                    <button onClick={() => setListingStatus(item.id, 'Rechazada')} className="flex-1 rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-semibold text-brand-text">Rechazar</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    </RoleGuard>
  );
}
