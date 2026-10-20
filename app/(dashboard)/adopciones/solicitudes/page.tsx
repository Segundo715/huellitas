import { AdoptionManager } from '@/components/adoption-manager';
import { RoleGuard } from '@/components/role-guard';
import { STAFF_ROLES } from '@/lib/auth/roles';

export default function SolicitudesPage() {
  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <AdoptionManager view="tablero" />
    </RoleGuard>
  );
}
