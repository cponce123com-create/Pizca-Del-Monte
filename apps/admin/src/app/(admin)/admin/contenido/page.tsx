import Link from 'next/link';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { AdminTable } from '../admin-table';

export default async function ContentPage() {
  await requireAdmin();
  const [categories, recipes, pages] = await Promise.all([
    prisma.category.findMany({ take: 100, orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true, isActive: true } }),
    prisma.recipe.findMany({ take: 100, orderBy: { title: 'asc' }, select: { id: true, title: true, slug: true, isPublished: true } }),
    prisma.page.findMany({ take: 100, orderBy: { title: 'asc' }, select: { id: true, title: true, slug: true, status: true } }),
  ]);
  return <div className="grid gap-8">
    <AdminTable title="Categorías" columns={['Nombre', 'Identificador', 'Estado']}
      rows={categories.map(category => ({ id: category.id, cells: [category.name, category.slug, category.isActive ? 'Activa' : 'Inactiva'] }))} />
    <AdminTable title="Recetas" columns={['Título', 'Identificador', 'Estado', 'Código QR']}
      rows={recipes.map(recipe => ({ id: recipe.id, cells: [
        recipe.title, recipe.slug, recipe.isPublished ? 'Publicada' : 'Borrador',
        recipe.isPublished ? <Link key={recipe.id} className="underline" href={`/admin/contenido/recetas/${recipe.id}/qr`} prefetch={false}>Descargar PNG</Link> : '—',
      ] }))} />
    <AdminTable title="Páginas" columns={['Título', 'Identificador', 'Estado']}
      rows={pages.map(page => ({ id: page.id, cells: [page.title, page.slug, page.status] }))} />
  </div>;
}
