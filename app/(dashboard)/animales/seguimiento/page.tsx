import { CareManager } from '@/components/care-manager';
import { RoleGuard } from '@/components/role-guard';
import { ALL_ROLES } from '@/lib/auth/roles';

export default function SeguimientoPage() {
  return (
    <RoleGuard allowedRoles={ALL_ROLES}>
      <CareManager />
    </RoleGuard>
  );
}
