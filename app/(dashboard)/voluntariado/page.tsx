import { RoleGuard } from '@/components/role-guard';
import { VolunteersManager } from '@/components/volunteers-manager';

export default function VoluntariadoPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'voluntario']}>
      <VolunteersManager />
    </RoleGuard>
  );
}
