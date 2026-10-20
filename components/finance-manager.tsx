'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, HandCoins, MoreHorizontal, PencilLine, Plus, RefreshCw, Scale, Search, Trash2, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatedNumber } from '@/components/animated-number';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { CashflowChart } from '@/components/finances/cashflow-chart';
import { SustainabilityHero, computeSustainability } from '@/components/finances/sustainability-hero';
import { TransactionFormDialog } from '@/components/finances/transaction-form-dialog';
import { FilterChip, PageHeader, StatCard, type StatDelta } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  deleteTransaction,
  formatDate,
  formatMoney,
  listTransactions,
  monthlyTotals,
  sortTransactions,
  todayIso,
  totalsFor,
  transactionsToCsv,
  type Transaction,
  type TransactionKind,
} from '@/lib/data/finances';
import { celebrate } from '@/lib/celebrate';
import { createClient } from '@/lib/supabase/client';
import { useCreateParam } from '@/lib/use-create-param';
import { cn } from '@/lib/utils';

const PERIODS = [
  { value: 'mes', label: 'Este mes' },
  { value: '3m', label: 'Últimos 3 meses' },
  { value: 'anio', label: 'Este año' },
  { value: 'todo', label: 'Todo' },
] as const;

type Period = (typeof PERIODS)[number]['value'];

function periodStart(period: Period) {
  const now = new Date();
  const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  switch (period) {
    case 'mes':
      return iso(new Date(now.getFullYear(), now.getMonth(), 1));
    case '3m':
      return iso(new Date(now.getFullYear(), now.getMonth() - 2, 1));
    case 'anio':
      return `${now.getFullYear()}-01-01`;
    default:
      return null;
  }
}

const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Mismo tramo del periodo anterior, para comparar de forma justa (p. ej. 1–19 de este mes vs 1–19 del anterior).
function previousRange(period: Period): [string, string] | null {
  const now = new Date();
  switch (period) {
    case 'mes': {
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      return [isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)), isoDate(new Date(now.getFullYear(), now.getMonth() - 1, Math.min(now.getDate(), lastDay)))];
    }
    case '3m':
      return [isoDate(new Date(now.getFullYear(), now.getMonth() - 5, 1)), isoDate(new Date(now.getFullYear(), now.getMonth() - 2, 0))];
    case 'anio':
      return [`${now.getFullYear() - 1}-01-01`, isoDate(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()))];
    default:
      return null;
  }
}

function deltaFor(current: number, previous: number | undefined, good: StatDelta['good'], label: string): StatDelta | null {
  if (previous === undefined || previous <= 0) return null;
  return { value: (current - previous) / previous, good, label };
}

function Amount({ item }: { item: Transaction }) {
  return (
    <span className={cn('font-semibold tabular-nums', item.kind === 'ingreso' ? 'text-emerald-700' : 'text-foreground')}>
      {item.kind === 'ingreso' ? '+' : '−'}
      {formatMoney(item.amount)}
    </span>
  );
}

export function FinanceManager() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [period, setPeriod] = useState<Period>('mes');
  const [kindFilter, setKindFilter] = useState<'todos' | TransactionKind>('todos');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formKind, setFormKind] = useState<TransactionKind>('ingreso');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [recentId, setRecentId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listTransactions(createClient()));
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los movimientos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const inPeriod = useMemo(() => {
    const start = periodStart(period);
    const today = todayIso();
    return start ? items.filter((item) => item.date >= start && item.date <= today) : items;
  }, [items, period]);

  const totals = useMemo(() => totalsFor(inPeriod), [inPeriod]);
  const previous = useMemo(() => {
    const range = previousRange(period);
    return range ? totalsFor(items.filter((item) => item.date >= range[0] && item.date <= range[1])) : null;
  }, [items, period]);
  const sustainability = useMemo(() => computeSustainability(items, inPeriod), [items, inPeriod]);
  const donors = useMemo(() => new Set(inPeriod.filter((i) => i.kind === 'ingreso' && i.contact).map((i) => i.contact!.trim().toLowerCase())).size, [inPeriod]);
  const months = useMemo(() => monthlyTotals(items, 6), [items]);

  const breakdown = useMemo(() => {
    const build = (kind: TransactionKind) => {
      const map = new Map<string, number>();
      for (const item of inPeriod) if (item.kind === kind) map.set(item.category, (map.get(item.category) ?? 0) + item.amount);
      const total = [...map.values()].reduce((sum, value) => sum + value, 0);
      return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([category, value]) => ({ category, value, share: total ? value / total : 0 }));
    };
    return { ingreso: build('ingreso'), gasto: build('gasto') };
  }, [inPeriod]);

  const [breakdownKind, setBreakdownKind] = useState<TransactionKind>('ingreso');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return inPeriod.filter((item) => {
      if (kindFilter !== 'todos' && item.kind !== kindFilter) return false;
      if (!query) return true;
      return [item.concept, item.category, item.contact, item.notes].some((value) => value?.toLowerCase().includes(query));
    });
  }, [inPeriod, kindFilter, search]);

  const openCreate = (kind: TransactionKind) => {
    setEditing(null);
    setFormKind(kind);
    setFormOpen(true);
  };

  useCreateParam(() => openCreate('ingreso'));

  const openEdit = (item: Transaction) => {
    setEditing(item);
    setFormOpen(true);
  };

  const handleSaved = (saved: Transaction) => {
    const isNew = !items.some((i) => i.id === saved.id);
    if (isNew && saved.kind === 'ingreso') celebrate();
    setRecentId(saved.id);
    setItems((current) => sortTransactions(current.some((i) => i.id === saved.id) ? current.map((i) => (i.id === saved.id ? saved : i)) : [saved, ...current]));
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteTransaction(createClient(), deleting.id);
      setItems((current) => current.filter((i) => i.id !== deleting.id));
      toast.success('Movimiento eliminado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar.');
    }
  };

  const exportCsv = () => {
    if (filtered.length === 0) {
      toast.info('No hay movimientos para exportar con estos filtros.');
      return;
    }
    // BOM para que Excel abra los acentos correctamente.
    const blob = new Blob(['﻿', transactionsToCsv(filtered)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `huellitas-movimientos-${todayIso()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const rowActions = (item: Transaction) => (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Acciones para ${item.concept}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => openEdit(item)}>
          <PencilLine /> Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setDeleting(item)} className="text-destructive focus:bg-rose-50 focus:text-destructive">
          <Trash2 /> Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const periodLabel = PERIODS.find((p) => p.value === period)!.label.toLowerCase();
  const money = (amount: number) => (loading ? '—' : <AnimatedNumber value={amount} format={formatMoney} />);
  const previousLabel = 'vs. el mismo tramo del periodo anterior';
  const shares = breakdown[breakdownKind];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Donaciones"
        title="Finanzas del refugio"
        description="Ingresos por donaciones y eventos, y gastos de operación."
        actions={
          <>
            <div className="w-40">
              <NativeSelect value={period} onChange={(e) => setPeriod(e.target.value as Period)} aria-label="Periodo">
                {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </NativeSelect>
            </div>
            <Button variant="outline" onClick={() => void load()} disabled={loading} aria-label="Recargar">
              <RefreshCw className={loading ? 'animate-spin' : undefined} />
            </Button>
            <Button variant="outline" onClick={() => openCreate('gasto')}>
              <TrendingDown /> Gasto
            </Button>
            <Button onClick={() => openCreate('ingreso')}>
              <Plus /> Donación
            </Button>
          </>
        }
      />

      {loadError ? (
        <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">No se pudieron cargar los datos</p>
          <p className="mt-1">{loadError}</p>
        </Card>
      ) : null}

      <SustainabilityHero data={sustainability} loading={loading} periodLabel={periodLabel} onDonate={() => openCreate('ingreso')} />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label="Ingresos" value={money(totals.income)} icon={TrendingUp} tone="emerald" hint={periodLabel} delta={loading ? null : deltaFor(totals.income, previous?.income, 'up', previousLabel)} />
        <StatCard label="Gastos" value={money(totals.expense)} icon={Wallet} tone="amber" hint={periodLabel} delta={loading ? null : deltaFor(totals.expense, previous?.expense, 'down', previousLabel)} />
        <StatCard
          label="Balance"
          value={loading ? '—' : <span className={totals.balance < 0 ? 'text-rose-700' : undefined}><AnimatedNumber value={totals.balance} format={formatMoney} /></span>}
          icon={Scale}
          tone={totals.balance < 0 ? 'rose' : 'sky'}
          hint={totals.balance < 0 ? 'Se gastó más de lo recibido' : periodLabel}
        />
        <StatCard label="Donantes" value={loading ? '—' : donors} icon={Users} tone="violet" hint={`Distintos, ${periodLabel}`} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Flujo mensual</CardTitle>
            <CardDescription>Ingresos y gastos de los últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>{loading ? <Skeleton className="h-56 w-full" /> : <CashflowChart months={months} />}</CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Por categoría</CardTitle>
              <CardDescription className="first-letter:uppercase">{periodLabel}</CardDescription>
            </div>
            <div className="flex gap-1.5">
              <FilterChip active={breakdownKind === 'ingreso'} onClick={() => setBreakdownKind('ingreso')}>Ingresos</FilterChip>
              <FilterChip active={breakdownKind === 'gasto'} onClick={() => setBreakdownKind('gasto')}>Gastos</FilterChip>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : shares.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Sin {breakdownKind === 'ingreso' ? 'ingresos' : 'gastos'} en este periodo.</p>
            ) : (
              <ul key={`${breakdownKind}-${period}`} className="stagger space-y-3.5">
                {shares.map((row, index) => (
                  <li key={row.category}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{row.category}</span>
                      <span className="tabular-nums">
                        <span className="font-semibold text-foreground">{formatMoney(row.value)}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{Math.round(row.share * 100)}%</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="grow-x h-full rounded-full"
                        style={{
                          width: `${Math.max(row.share * 100, 1)}%`,
                          background: breakdownKind === 'ingreso' ? 'linear-gradient(90deg, #2a78d699, #2a78d6)' : 'linear-gradient(90deg, #eb683499, #eb6834)',
                          animationDelay: `${index * 80}ms`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2">
            {(['todos', 'ingreso', 'gasto'] as const).map((kind) => (
              <FilterChip key={kind} active={kindFilter === kind} onClick={() => setKindFilter(kind)}>
                {kind === 'todos' ? 'Todos' : kind === 'ingreso' ? 'Ingresos' : 'Gastos'}
              </FilterChip>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1 lg:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar concepto, donante..." className="pl-9" aria-label="Buscar movimientos" />
            </div>
            <Button variant="outline" onClick={exportCsv} disabled={loading}>
              <Download /> <span className="hidden sm:inline">CSV</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <HandCoins className="h-6 w-6" />
            </div>
            <p className="mt-3 font-semibold">{items.length === 0 ? 'Aún no hay movimientos' : 'Sin movimientos en este periodo'}</p>
            <p className="mt-1 text-sm text-muted-foreground">{items.length === 0 ? 'Registra la primera donación del refugio.' : 'Cambia el periodo o los filtros.'}</p>
            <Button className="mt-4" onClick={() => openCreate('ingreso')}>
              <Plus /> Registrar donación
            </Button>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead className="w-12"><span className="sr-only">Acciones</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id} className={item.id === recentId ? 'row-flash' : undefined}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(item.date)}</TableCell>
                      <TableCell>
                        <button type="button" onClick={() => openEdit(item)} className="group text-left">
                          <p className="font-semibold group-hover:text-primary">{item.concept}</p>
                          {item.contact ? <p className="text-xs text-muted-foreground">{item.contact}</p> : null}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.kind === 'ingreso' ? 'info' : 'neutral'}>{item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.method}</TableCell>
                      <TableCell className="text-right"><Amount item={item} /></TableCell>
                      <TableCell>{rowActions(item)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="divide-y md:hidden">
              {filtered.map((item) => (
                <li key={item.id} className={cn('flex items-center gap-3 p-4', item.id === recentId && 'row-flash')}>
                  <button type="button" onClick={() => openEdit(item)} className="min-w-0 flex-1 text-left">
                    <p className="truncate font-semibold">{item.concept}</p>
                    <p className="truncate text-xs text-muted-foreground">{formatDate(item.date)} · {item.category}</p>
                  </button>
                  <Amount item={item} />
                  {rowActions(item)}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-xs text-muted-foreground">
              <span>Mostrando {filtered.length} movimientos</span>
              <span className="tabular-nums">
                Suma: <span className="font-semibold text-foreground">{formatMoney(totalsFor(filtered).balance)}</span>
              </span>
            </div>
          </>
        )}
      </Card>

      <TransactionFormDialog open={formOpen} onOpenChange={setFormOpen} transaction={editing} defaultKind={formKind} onSaved={handleSaved} />
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="¿Eliminar este movimiento?"
        description={`Se borrará "${deleting?.concept ?? ''}" por ${deleting ? formatMoney(deleting.amount) : ''}. Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
