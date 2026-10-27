import type { Metadata } from 'next';
import { InventoryManager } from '@/components/inventory-manager';
import { RoleGuard } from '@/components/role-guard';
import { STAFF_ROLES } from '@/lib/auth/roles';

export const metadata: Metadata = { title: 'Inventario' };

export default function InventarioPage() {
  return (
    <RoleGuard allowedRoles={STAFF_ROLES}>
      <InventoryManager />
    </RoleGuard>
  );
}
