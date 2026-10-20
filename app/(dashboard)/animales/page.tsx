import { AnimalManager } from '@/components/animal-manager';
import { RoleGuard } from '@/components/role-guard';
import { STAFF_ROLES } from '@/lib/auth/roles';

export default function AnimalesPage() {
  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <AnimalManager />
    </RoleGuard>
  );
}
