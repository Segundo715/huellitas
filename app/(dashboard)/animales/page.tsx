import type { Metadata } from 'next';
import { AnimalManager } from '@/components/animal-manager';
import { RoleGuard } from '@/components/role-guard';
import { STAFF_ROLES } from '@/lib/auth/roles';

export const metadata: Metadata = { title: 'Animales' };

export default function AnimalesPage() {
  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <AnimalManager />
    </RoleGuard>
  );
}
