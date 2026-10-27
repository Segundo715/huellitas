import type { Metadata } from 'next';
import { DashboardOverview } from '@/components/dashboard-overview';
import { RoleGuard } from '@/components/role-guard';
import { ALL_ROLES } from '@/lib/auth/roles';

export const metadata: Metadata = { title: 'Panel' };

export default function DashboardPage() {
  return (
    <RoleGuard allowedRoles={ALL_ROLES}>
      <DashboardOverview />
    </RoleGuard>
  );
}
