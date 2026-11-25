import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { AdminTable, adminDate } from '../../admin-table';
import { advancePreparation } from '../actions';

export default async function OrderPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { error, saved } = await searchParams;
  const order = await prisma.order.findUnique({
    where: { id },
    select: { orderNumber: true, status: true, createdAt: true, total: true, currency: true,
      items: { select: { id: true, quantity: true, product: { select: { name: true, sku: true } } } },
      statusHistory: { orderBy: { createdAt: 'desc' }, select: { id: true, toStatus: true, reason: true, createdAt: true } },
    },
  });
  if (!order) notFound();
  return <div className="grid gap-6">
    <Link className="underline" href="/admin/pedidos">Volver a pedidos</Link>
    <header><h1 className="text-3xl font-bold">Pedido {order.orderNumber}</h1>
      <p>{adminDate(order.createdAt)} · {order.status} · {order.currency} {order.total.toFixed(2)}</p></header>
    {error && <p role="alert">El estado del pedido cambió. Revisa el historial antes de continuar.</p>}
    {saved === '1' && <p role="status">Estado actualizado.</p>}
    {(order.status === 'PAYMENT_CONFIRMED' || order.status === 'PREPARING') &&
      <form action={advancePreparation.bind(null, id, order.status)}>
        <button type="submit" className="rounded bg-primary px-4 py-2 text-primary-foreground">
          {order.status === 'PAYMENT_CONFIRMED' ? 'Iniciar preparación' : 'Marcar listo para envío'}
        </button>
      </form>}
    <AdminTable title="Productos del pedido" columns={['Producto', 'SKU', 'Cantidad']}
      rows={order.items.map(item => ({ id: item.id, cells: [item.product?.name ?? 'Producto retirado', item.product?.sku ?? '—', item.quantity] }))} />
    <AdminTable title="Historial" columns={['Fecha', 'Estado', 'Motivo']}
      rows={order.statusHistory.map(event => ({ id: event.id, cells: [adminDate(event.createdAt), event.toStatus, event.reason ?? '—'] }))} />
  </div>;
}
