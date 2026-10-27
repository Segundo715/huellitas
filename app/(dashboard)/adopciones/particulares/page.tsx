import type { Metadata } from 'next';
import { ListingsManager } from '@/components/listings-manager';
import { RoleGuard } from '@/components/role-guard';
import { STAFF_ROLES } from '@/lib/auth/roles';

export const metadata: Metadata = { title: 'Adopciones particulares' };

export default function AdopcionesParticularesPage() {
  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <ListingsManager />
    </RoleGuard>
  );
}
