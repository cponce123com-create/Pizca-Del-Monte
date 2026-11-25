import Link from 'next/link';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { AdminTable, adminDate } from '../admin-table';

export default async function OrdersPage() {
  await requireAdmin();
  const orders = await prisma.order.findMany({
    take: 100, orderBy: { createdAt: 'desc' },
    select: { id: true, orderNumber: true, total: true, currency: true, status: true, createdAt: true },
  });
  return <AdminTable title="Pedidos" columns={['Pedido', 'Fecha', 'Estado', 'Total']}
    rows={orders.map(order => ({ id: order.id, cells: [
      <Link key={order.id} className="underline" href={`/admin/pedidos/${order.id}`}>{order.orderNumber}</Link>,
      adminDate(order.createdAt), order.status, `${order.currency} ${order.total.toFixed(2)}`,
    ] }))} />;
}
