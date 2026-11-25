import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { ProductForm } from '../product-form';

export default async function EditProductPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { error } = await searchParams;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();

  return <section className="grid gap-5">
    <Link href="/admin/productos" className="underline">Volver a productos</Link>
    <h1 className="text-3xl font-bold">Editar producto</h1>
    <ProductForm product={product} error={error} />
  </section>;
}
