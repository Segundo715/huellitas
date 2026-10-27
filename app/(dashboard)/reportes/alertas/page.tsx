import type { Metadata } from 'next';
import { AlertsCenter } from '@/components/alerts-center';
import { RoleGuard } from '@/components/role-guard';
import { STAFF_ROLES } from '@/lib/auth/roles';

export const metadata: Metadata = { title: 'Centro de alertas' };

export default function AlertasPage() {
  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <AlertsCenter />
    </RoleGuard>
  );
}
