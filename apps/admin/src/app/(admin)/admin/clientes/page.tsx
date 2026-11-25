import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { AdminTable } from '../admin-table';

export default async function CustomersPage() {
  await requireAdmin();
  const customers = await prisma.customer.findMany({
    take: 100, orderBy: [{ lastName: 'asc' }, { id: 'asc' }],
    select: { id: true, firstName: true, lastName: true, email: true, isWholesale: true, _count: { select: { orders: true } } },
  });
  return <AdminTable title="Clientes" columns={['Nombre', 'Correo', 'Tipo', 'Pedidos']}
    rows={customers.map(customer => ({ id: customer.id, cells: [
      `${customer.firstName} ${customer.lastName}`, customer.email, customer.isWholesale ? 'Mayorista' : 'Minorista', customer._count.orders,
    ] }))} />;
}
