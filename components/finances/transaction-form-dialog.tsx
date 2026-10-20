'use client';

import { useEffect, useState } from 'react';
import { Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import {
  PAYMENT_METHODS,
  categoriesFor,
  createTransaction,
  emptyTransactionForm,
  formatMoney,
  transactionFormSchema,
  transactionToForm,
  updateTransaction,
  type Transaction,
  type TransactionFormValues,
  type TransactionKind,
} from '@/lib/data/finances';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type FieldErrors = Partial<Record<keyof TransactionFormValues, string>>;

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs font-medium text-destructive">{message}</p> : null;
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  defaultKind,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  defaultKind: TransactionKind;
  onSaved: (transaction: Transaction) => void;
}) {
  const [form, setForm] = useState<TransactionFormValues>(() => emptyTransactionForm());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(transaction ? transactionToForm(transaction) : emptyTransactionForm(defaultKind));
      setErrors({});
    }
  }, [open, transaction, defaultKind]);

  const set = (field: keyof TransactionFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const setKind = (kind: TransactionKind) => {
    setForm((current) => (current.kind === kind ? current : { ...current, kind, category: categoriesFor(kind)[0] }));
    setErrors((current) => ({ ...current, category: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = transactionFormSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof TransactionFormValues;
        nextErrors[field] ??= issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const saved = transaction ? await updateTransaction(supabase, transaction.id, parsed.data) : await createTransaction(supabase, parsed.data);
      if (transaction) toast.success('Movimiento actualizado');
      else if (saved.kind === 'ingreso') toast.success(`¡${formatMoney(saved.amount)} más para el refugio! 🐾`, { description: saved.contact ? `Gracias, ${saved.contact}.` : 'Ingreso registrado.' });
      else toast.success('Gasto registrado');
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el movimiento.');
    } finally {
      setSaving(false);
    }
  };

  const isIncome = form.kind === 'ingreso';

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Editar movimiento' : 'Nuevo movimiento'}</DialogTitle>
          <DialogDescription>Registra donaciones recibidas y gastos del refugio.</DialogDescription>
        </DialogHeader>

        <form id="transaction-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="grid grid-cols-2 gap-2 sm:col-span-2" role="radiogroup" aria-label="Tipo de movimiento">
            {(['ingreso', 'gasto'] as const).map((kind) => {
              const Icon = kind === 'ingreso' ? TrendingUp : TrendingDown;
              const active = form.kind === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setKind(kind)}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
                    active ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" /> {kind === 'ingreso' ? 'Ingreso' : 'Gasto'}
                </button>
              );
            })}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tx-concept">Concepto *</Label>
            <Input id="tx-concept" value={form.concept} onChange={(e) => set('concept', e.target.value)} placeholder={isIncome ? 'Ej. Donación en línea' : 'Ej. Croquetas premium'} aria-invalid={Boolean(errors.concept)} />
            <FieldError message={errors.concept} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-amount">Importe (MXN) *</Label>
            <Input id="tx-amount" type="number" min="0" step="0.01" inputMode="decimal" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" aria-invalid={Boolean(errors.amount)} />
            <FieldError message={errors.amount} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-date">Fecha *</Label>
            <Input id="tx-date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} aria-invalid={Boolean(errors.date)} />
            <FieldError message={errors.date} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-category">Categoría</Label>
            <NativeSelect id="tx-category" value={form.category} onChange={(e) => set('category', e.target.value)} aria-invalid={Boolean(errors.category)}>
              {categoriesFor(form.kind).map((option) => <option key={option}>{option}</option>)}
            </NativeSelect>
            <FieldError message={errors.category} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-method">Método</Label>
            <NativeSelect id="tx-method" value={form.method} onChange={(e) => set('method', e.target.value)}>
              {PAYMENT_METHODS.map((option) => <option key={option}>{option}</option>)}
            </NativeSelect>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tx-contact">{isIncome ? 'Donante' : 'Proveedor'}</Label>
            <Input id="tx-contact" value={form.contact} onChange={(e) => set('contact', e.target.value)} placeholder={isIncome ? 'Nombre de la persona u organización (opcional)' : 'A quién se pagó (opcional)'} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tx-notes">Notas</Label>
            <Textarea id="tx-notes" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Folio, recibo, detalle..." aria-invalid={Boolean(errors.notes)} />
            <FieldError message={errors.notes} />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="transaction-form" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            {saving ? 'Guardando...' : transaction ? 'Guardar cambios' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
