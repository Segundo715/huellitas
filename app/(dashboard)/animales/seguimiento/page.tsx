import type { Metadata } from 'next';
import { CareManager } from '@/components/care-manager';
import { RoleGuard } from '@/components/role-guard';
import { ALL_ROLES } from '@/lib/auth/roles';

export const metadata: Metadata = { title: 'Seguimiento de cuidados' };

export default function SeguimientoPage() {
  return (
    <RoleGuard allowedRoles={ALL_ROLES}>
      <CareManager />
    </RoleGuard>
  );
}
