import type { Metadata } from 'next';
import { RoleGuard } from '@/components/role-guard';
import { UsersManager } from '@/components/users-manager';

export const metadata: Metadata = { title: 'Usuarios' };

export default function UsuariosPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <UsersManager />
    </RoleGuard>
  );
}
