import type { MetadataRoute } from 'next';
import { isDemoMode } from '@/lib/demo-mode';
import { prisma } from '@pizca/database';
import { demoRecipes } from '@/lib/demo-recipes';
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isDemoMode()) return [];
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base || !/^https?:\/\//.test(base)) return [];
  const origin = new URL(base).origin;
  const knownCategories = ['especias', 'sales-gourmet', 'aceites-vinagres', 'mezclas-salsas', 'packs-gourmet', 'accesorios'];
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: { status: 'ACTIVE' }, select: { slug: true } }),
    prisma.category.findMany({ where: { isActive: true, slug: { in: knownCategories } }, select: { slug: true } }),
  ]);
  const paths = ['/', '/tienda', '/recetas', ...products.map(product => `/producto/${encodeURIComponent(product.slug)}`), ...categories.map(category => `/tienda/categoria/${encodeURIComponent(category.slug)}`), ...demoRecipes.map(recipe => `/recetas/${encodeURIComponent(recipe.slug)}`)];
  return paths.map(path => ({ url: `${origin}${path}`, changeFrequency: 'weekly' as const, priority: path === '/' ? 1 : 0.8 }));
}
