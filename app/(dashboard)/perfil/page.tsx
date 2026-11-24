import type { Metadata } from 'next';
import { ProfileSettings } from '@/components/profile-settings';
import { RoleGuard } from '@/components/role-guard';

export const metadata: Metadata = { title: 'Mi perfil' };

export default function PerfilPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'operador', 'moderador', 'voluntario']}>
      <ProfileSettings />
    </RoleGuard>
  );
}