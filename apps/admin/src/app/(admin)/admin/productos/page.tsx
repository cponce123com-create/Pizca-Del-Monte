import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';
export default async function ProductsPage() {
  await requireAdmin();
  const products = await prisma.product.findMany({ take: 100, orderBy: { name: 'asc' }, select: { id: true, name: true, sku: true, status: true, basePrice: true } });
  return <section><h1 className="text-3xl font-bold">Productos</h1>
    <p className="mt-2 text-muted-foreground">Consulta de los primeros 100 productos. La edición está en preparación.</p>
    <div className="mt-6 overflow-x-auto rounded-xl border"><table className="w-full min-w-[34rem] text-left text-sm">
      <thead><tr className="border-b"><th className="p-3">Producto</th><th className="p-3">SKU</th><th className="p-3">Estado</th><th className="p-3">Precio base</th></tr></thead>
      <tbody>{products.map(product => <tr key={product.id} className="border-b last:border-0"><td className="p-3">{product.name}</td><td className="p-3">{product.sku}</td><td className="p-3">{product.status}</td><td className="p-3">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(product.basePrice.toNumber())}</td></tr>)}</tbody>
    </table>{products.length === 0 && <p className="p-5">No hay productos registrados.</p>}</div>
  </section>;
}
