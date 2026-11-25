import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { AdminTable, adminDate } from '../admin-table';
import { adjustStock } from './actions';

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin();
  const { saved, error } = await searchParams;
  const [items, movements] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { productId: { not: null }, variantId: null }, take: 100, orderBy: { id: 'asc' },
      select: { id: true, quantity: true, reservedQty: true, availableQty: true, _count: { select: { lots: true } },
        product: { select: { name: true, sku: true } } },
    }),
    prisma.stockMovement.findMany({
      take: 40, orderBy: { createdAt: 'desc' },
      select: { id: true, previousQty: true, newQty: true, notes: true, createdAt: true, product: { select: { sku: true } } },
    }),
  ]);
  return <div className="grid gap-8">
    {saved === '1' && <p role="status">Inventario guardado.</p>}
    {error && <p role="alert">{error === 'conflict' ? 'El inventario cambió mientras editabas. Revisa la cantidad y vuelve a intentar.' : 'Revisa la cantidad, las reservas y el tipo de inventario.'}</p>}
    <AdminTable title="Inventario" columns={['SKU', 'Producto', 'Total', 'Reservado', 'Disponible', 'Ajuste']}
      rows={items.map(item => ({ id: item.id, cells: [item.product?.sku, item.product?.name, item.quantity, item.reservedQty, item.availableQty,
        item._count.lots ? 'Gestionado por lote' : <form key={item.id} action={adjustStock.bind(null, item.id, item.quantity)} className="flex min-w-64 flex-wrap gap-2">
          <input name="quantity" type="number" aria-label="Nueva cantidad" min={item.reservedQty} max={999999999} step={1} defaultValue={item.quantity} required className="w-24 rounded border p-1" />
          <input name="reason" aria-label="Motivo del ajuste" placeholder="Motivo" minLength={3} maxLength={300} required className="w-32 rounded border p-1" />
          <button type="submit" className="rounded border px-2">Guardar</button>
        </form>,
      ] }))} />
    <AdminTable title="Movimientos recientes" columns={['Fecha', 'SKU', 'Anterior', 'Nuevo', 'Motivo']}
      rows={movements.map(movement => ({ id: movement.id, cells: [
        adminDate(movement.createdAt), movement.product.sku, movement.previousQty, movement.newQty, movement.notes ?? '—',
      ] }))} />
  </div>;
}
