import { ReportsManager } from '@/components/reports-manager';
import { RoleGuard } from '@/components/role-guard';
import { ALL_ROLES } from '@/lib/auth/roles';

export default function ReportesPage() {
  return (
    <RoleGuard allowedRoles={ALL_ROLES}>
      <ReportsManager />
    </RoleGuard>
  );
}
