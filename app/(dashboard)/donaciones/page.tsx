import type { Metadata } from 'next';
import { FinanceManager } from '@/components/finance-manager';
import { RoleGuard } from '@/components/role-guard';
import { STAFF_ROLES } from '@/lib/auth/roles';

export const metadata: Metadata = { title: 'Donaciones y finanzas' };

export default function DonacionesPage() {
  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <FinanceManager />
    </RoleGuard>
  );
}
