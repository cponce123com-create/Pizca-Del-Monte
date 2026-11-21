import type { Metadata } from 'next';
import { Hero } from '@/components/home/hero';
import { FeaturedCategories } from '@/components/home/featured-categories';
import { FeaturedProducts } from '@/components/home/featured-products';
import { FeaturedRecipes } from '@/components/home/featured-recipes';
import { Newsletter } from '@/components/home/newsletter';
import { TrustBadges } from '@/components/home/trust-badges';
export const metadata: Metadata = { title: 'Especias, Sales y Aceites Gourmet Peruanos', description: 'Explora el catálogo de Pizca del Monte.' };
export default function HomePage() {
  return <><Hero /><TrustBadges /><FeaturedCategories /><FeaturedProducts /><FeaturedRecipes /><Newsletter /></>;
}
