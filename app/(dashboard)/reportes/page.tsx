'use client';

import { useState } from 'react';
import { reports } from '@/lib/mock-data';
import { RoleGuard } from '@/components/role-guard';
import { useDemoValue } from '@/lib/demo-storage';

export default function ReportesPage() {
  const [reportList, setReportList] = useDemoValue('huellitas-demo-reports', reports);
  const [selectedReportId, setSelectedReportId] = useState(reports[0]?.id ?? 0);
  const selectedReport = reportList.find((report) => report.id === selectedReportId) ?? reportList[0];

  return (
    <RoleGuard allowedRoles={['admin', 'operador', 'voluntario']}>
      <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-brand-primary">Reportes ciudadanos</p>
        <h1 className="text-3xl font-bold text-brand-text">Atención e incidentes</h1>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-soft">
          <h2 className="text-xl font-bold text-brand-text">Casos recibidos</h2>
          <div className="mt-4 space-y-3">
            {reportList.map((report) => (
              <button type="button" key={report.id} onClick={() => setSelectedReportId(report.id)} className={`w-full rounded-xl border p-3 text-left transition ${selectedReport?.id === report.id ? 'border-brand-primary bg-brand-soft' : 'border-brand-border bg-slate-50 hover:border-brand-primary/50'}`}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-brand-text">{report.type}</p>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                    report.priority === 'Alta' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>{report.priority}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-brand-muted">
                  <span>{report.date}</span>
                  <span>{report.status}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-brand-text">Detalle del reporte</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-brand-border bg-brand-soft p-3">
              <p className="text-xs text-brand-muted">Ubicación</p>
              <p className="mt-1 font-semibold text-brand-text">{selectedReport ? `Caso #${selectedReport.id}` : 'Sin caso seleccionado'}</p>
            </div>
            <div className="rounded-xl border border-brand-border bg-brand-soft p-3">
              <p className="text-xs text-brand-muted">Estado</p>
              <p className="mt-1 font-semibold text-brand-text">{selectedReport?.status ?? 'Sin estado'}</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-dashed border-brand-border bg-slate-50 p-4">
            <p className="text-sm text-brand-muted">Mapa / ubicación</p>
            <div className="mt-3 h-40 rounded-xl bg-gradient-to-br from-sky-100 via-white to-brand-soft" />
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-brand-text">Descripción</p>
            <p className="mt-2 text-sm text-brand-muted">{selectedReport?.type ?? 'Selecciona un caso'} · Prioridad {selectedReport?.priority ?? 'no definida'}. {selectedReport ? `Reporte recibido ${selectedReport.date.toLowerCase()}.` : ''}</p>
          </div>

          <div className="mt-5">
            <label htmlFor="report-status" className="text-sm font-medium text-brand-text">Cambiar estado</label>
            <select
              id="report-status"
              value={selectedReport?.status ?? ''}
              onChange={(event) => {
                if (!selectedReport) return;
                setReportList((current) => current.map((report) => report.id === selectedReport.id ? { ...report, status: event.target.value } : report));
              }}
              disabled={!selectedReport}
              className="mt-2 w-full rounded-xl border border-brand-border bg-slate-50 px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary disabled:opacity-60"
            >
              <option>Pendiente</option>
              <option>Aprobado</option>
              <option>Rechazado</option>
              <option>Atendido</option>
            </select>
          </div>
        </div>
      </div>
    </div>
    </RoleGuard>
  );
}
