import type { Metadata } from 'next';
import { EventsManager } from '@/components/events-manager';
import { RoleGuard } from '@/components/role-guard';
import { ALL_ROLES } from '@/lib/auth/roles';

export const metadata: Metadata = { title: 'Eventos' };

export default function EventosPage() {
  return (
    <RoleGuard allowedRoles={ALL_ROLES}>
      <EventsManager />
    </RoleGuard>
  );
}
