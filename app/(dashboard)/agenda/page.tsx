import type { Metadata } from 'next';
import { AgendaManager } from '@/components/agenda-manager';
import { RoleGuard } from '@/components/role-guard';
import { ALL_ROLES } from '@/lib/auth/roles';

export const metadata: Metadata = { title: 'Agenda' };

export default function AgendaPage() {
  return (
    <RoleGuard allowedRoles={ALL_ROLES}>
      <AgendaManager />
    </RoleGuard>
  );
}
