import { RoleGuard } from '@/components/role-guard';

const alertList = [
  { id: 1, title: 'Medicamento crítico', detail: 'Antibiótico para cachorros está próximo a caducar.', level: 'Alta', time: 'Hace 2h' },
  { id: 2, title: 'Vacunas pendientes', detail: '5 animales requieren refuerzo de rabia.', level: 'Media', time: 'Hace 5h' },
  { id: 3, title: 'Inventario bajo', detail: 'Pellet para gatos con stock por debajo del mínimo.', level: 'Media', time: 'Hoy' },
  { id: 4, title: 'Revisión sanitaria', detail: 'Sala B necesita limpieza y desinfección.', level: 'Baja', time: 'Ayer' },
];

export default function AlertasPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'operador']}>
      <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-amber-700">Alertas</p>
        <h1 className="text-3xl font-bold text-slate-900">Centro de incidencias</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm text-slate-500">Críticas</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">2</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm text-slate-500">Medias</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">4</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm text-slate-500">Bajas</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">3</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm text-slate-500">Resueltas</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">11</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-bold text-slate-900">Incidencias vigentes</h2>
        <div className="mt-5 space-y-3">
          {alertList.map((alert) => (
            <div key={alert.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">{alert.title}</p>
                <p className="text-sm text-slate-500">{alert.detail}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  alert.level === 'Alta' ? 'bg-rose-100 text-rose-700' :
                  alert.level === 'Media' ? 'bg-amber-100 text-amber-700' :
                  'bg-sky-100 text-sky-700'
                }`}>{alert.level}</span>
                <span className="text-sm text-slate-500">{alert.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
    </RoleGuard>
  );
}
