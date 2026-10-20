import { ListingsManager } from '@/components/listings-manager';
import { RoleGuard } from '@/components/role-guard';
import { STAFF_ROLES } from '@/lib/auth/roles';

export default function AdopcionesParticularesPage() {
  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <ListingsManager />
    </RoleGuard>
  );
}
