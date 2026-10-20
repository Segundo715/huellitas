import { RoleGuard } from '@/components/role-guard';
import { UsersManager } from '@/components/users-manager';

export default function UsuariosPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <UsersManager />
    </RoleGuard>
  );
}
