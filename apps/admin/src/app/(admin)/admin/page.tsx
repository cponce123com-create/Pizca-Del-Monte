import Link from 'next/link';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';
export default async function AdminDashboard() {
  await requireAdmin();
  const [products, activeProducts, orders] = await Promise.all([
    prisma.product.count(), prisma.product.count({ where: { status: 'ACTIVE' } }), prisma.order.count(),
  ]);
  return <section>
    <h1 className="text-3xl font-bold">Resumen de la tienda</h1>
    <p className="mt-2 text-muted-foreground">Controla el catálogo, el inventario y los pedidos registrados.</p>
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      {[['Productos', products], ['Productos activos', activeProducts], ['Pedidos registrados', orders]].map(([label, value]) => <div key={label} className="rounded-xl border p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>)}
    </div>
    <Link href="/admin/productos" className="mt-8 inline-block underline">Gestionar productos</Link>
  </section>;
}
