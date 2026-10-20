import { AlertsCenter } from '@/components/alerts-center';
import { RoleGuard } from '@/components/role-guard';
import { STAFF_ROLES } from '@/lib/auth/roles';

export default function AlertasPage() {
  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <AlertsCenter />
    </RoleGuard>
  );
}
