import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { AdminTable, adminDate } from '../admin-table';

export default async function OperationsPage() {
  await requireAdmin();
  const [shipments, documents, entries] = await Promise.all([
    prisma.shipment.findMany({
      take: 100, orderBy: { shipmentNumber: 'desc' },
      select: { id: true, shipmentNumber: true, status: true, trackingNumber: true, carrier: { select: { name: true } } },
    }),
    prisma.document.findMany({
      take: 100, orderBy: { createdAt: 'desc' },
      select: { id: true, type: true, series: true, number: true, sunatStatus: true, createdAt: true },
    }),
    prisma.accountingEntry.findMany({
      take: 100, orderBy: { date: 'desc' },
      select: { id: true, entryNumber: true, date: true, description: true, totalDebit: true, totalCredit: true, status: true },
    }),
  ]);

  return <div className="grid gap-8">
    <AdminTable title="Envíos" columns={['Envío', 'Transportista', 'Estado', 'Seguimiento']}
      rows={shipments.map(shipment => ({ id: shipment.id, cells: [
        shipment.shipmentNumber, shipment.carrier.name, shipment.status, shipment.trackingNumber ?? '—',
      ] }))} />
    <AdminTable title="Comprobantes registrados" columns={['Fecha', 'Tipo', 'Número', 'Estado SUNAT']}
      rows={documents.map(document => ({ id: document.id, cells: [
        adminDate(document.createdAt), document.type, `${document.series}-${document.number}`, document.sunatStatus ?? '—',
      ] }))} />
    <AdminTable title="Asientos contables" columns={['Fecha', 'Asiento', 'Descripción', 'Debe (S/)', 'Haber (S/)', 'Estado']}
      rows={entries.map(entry => ({ id: entry.id, cells: [
        adminDate(entry.date), entry.entryNumber, entry.description, entry.totalDebit.toFixed(2), entry.totalCredit.toFixed(2), entry.status,
      ] }))} />
  </div>;
}
