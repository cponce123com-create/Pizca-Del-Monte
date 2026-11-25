import Link from 'next/link';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';

import { ProductForm } from './product-form';

export const dynamic = 'force-dynamic';
export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; error?: string; saved?: string }> }) {
  await requireAdmin();
  const { q, error, saved } = await searchParams;
  const query = typeof q === 'string' ? q.trim().slice(0, 120) : '';
  const products = await prisma.product.findMany({ where: query ? { OR: [{ name: { contains: query, mode: 'insensitive' } }, { sku: { contains: query, mode: 'insensitive' } }] } : undefined, take: 100, orderBy: { name: 'asc' }, select: { id: true, name: true, sku: true, status: true, basePrice: true } });
  return <section><h1 className="text-3xl font-bold">Productos</h1>
    {saved === '1' && <p role="status" className="mt-2">Producto guardado.</p>}
    <details className="my-5" open={Boolean(error)}>
      <summary className="mb-3 cursor-pointer font-semibold">Nuevo producto</summary>
      <ProductForm error={error} />
    </details>
    <form className="flex flex-wrap gap-3">
      <input aria-label="Buscar por nombre o SKU" name="q" className="rounded border p-2" placeholder="Nombre o SKU" defaultValue={query} />
      <button type="submit" className="rounded border px-4">Buscar</button>
    </form>
    <div className="mt-6 overflow-x-auto rounded-xl border"><table className="w-full min-w-[34rem] text-left text-sm">
      <thead><tr className="border-b"><th className="p-3">Producto</th><th className="p-3">SKU</th><th className="p-3">Estado</th><th className="p-3">Precio base</th></tr></thead>
      <tbody>{products.map(product => <tr key={product.id} className="border-b last:border-0"><td className="p-3"><Link className="underline" href={`/admin/productos/${product.id}`}>{product.name}</Link></td><td className="p-3">{product.sku}</td><td className="p-3">{product.status}</td><td className="p-3">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(product.basePrice.toNumber())}</td></tr>)}</tbody>
    </table>{products.length === 0 && <p className="p-5">No hay productos registrados.</p>}</div>
  </section>;
}
