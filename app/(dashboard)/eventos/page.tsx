import { EventsManager } from '@/components/events-manager';
import { RoleGuard } from '@/components/role-guard';
import { ALL_ROLES } from '@/lib/auth/roles';

export default function EventosPage() {
  return (
    <RoleGuard allowedRoles={ALL_ROLES}>
      <EventsManager />
    </RoleGuard>
  );
}
