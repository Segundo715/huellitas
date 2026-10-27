import type { Metadata } from 'next';
import { RoleGuard } from '@/components/role-guard';
import { VolunteersManager } from '@/components/volunteers-manager';

export const metadata: Metadata = { title: 'Voluntariado' };

export default function VoluntariadoPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'voluntario']}>
      <VolunteersManager />
    </RoleGuard>
  );
}
