import { redirect } from 'next/navigation';

const categories = new Set(['especias', 'sales-gourmet', 'aceites-vinagres', 'mezclas-salsas', 'packs-gourmet', 'accesorios']);

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!categories.has(slug)) redirect('/tienda');
  redirect(`/tienda?category=${encodeURIComponent(slug)}`);
}
