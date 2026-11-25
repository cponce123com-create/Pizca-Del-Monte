import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { AdminTable, adminDate } from '../admin-table';

export default async function AuditPage() {
  await requireAdmin();
  const events = await prisma.auditLog.findMany({
    take: 100, orderBy: { createdAt: 'desc' },
    select: { id: true, action: true, entityType: true, entityId: true, createdAt: true, user: { select: { email: true } } },
  });
  return <AdminTable title="Auditoría" columns={['Fecha', 'Usuario', 'Acción', 'Entidad', 'Identificador']}
    rows={events.map(event => ({ id: event.id, cells: [
      adminDate(event.createdAt), event.user?.email ?? 'Sistema', event.action, event.entityType, event.entityId,
    ] }))} />;
}
