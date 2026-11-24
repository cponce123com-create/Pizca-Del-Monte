import Link from 'next/link';
import { ChevronRight, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DemoProductImage } from '@/components/products/demo-product-image';
import { demoProducts } from '@/lib/demo-products';
import { isDemoMode } from '@/lib/demo-mode';

const featuredSlugs = [
  'aji-amarillo-molido',
  'sal-de-maras-flor-de-sal',
  'aceite-oliva-arbequina',
  'pack-parrilla-peruana',
];

export function FeaturedProducts() {
  const isDemo = isDemoMode();
  const products = isDemo
    ? featuredSlugs.flatMap(slug => {
        const product = demoProducts.find(item => item.slug === slug);
        return product ? [product] : [];
      })
    : [];

  return (
    <section className="bg-background py-16" aria-labelledby="products-heading">
      <div className="container">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Para empezar a explorar</p>
            <h2 id="products-heading" className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Productos destacados</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">{isDemo ? 'Una selección de sabores peruanos para armar tu despensa con intención.' : 'Explora los productos del catálogo.'}</p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/tienda">Ver catálogo completo <ChevronRight className="h-4 w-4" /></Link>
          </Button>
        </div>
        {products.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map(product => (
              <Card key={product.id} className="group overflow-hidden rounded-2xl border-border/80 bg-background transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10">
                <Link href={'/producto/' + product.slug} className="block h-full">
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <DemoProductImage name={product.name} category={product.categories[0].name} src={product.primaryImage?.url} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    {product.categories[0].slug === 'packs-gourmet' && <Badge variant="accent" className="absolute left-3 top-3"><Package className="mr-1 h-3 w-3" /> Pack</Badge>}
                  </div>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2"><p className="text-xs font-medium uppercase tracking-wide text-primary">{product.categories[0].name}</p><span className="text-xs text-muted-foreground">{product.variants[0]?.name}</span></div>
                    <h3 className="font-semibold leading-snug group-hover:text-primary">{product.name}</h3>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{product.shortDescription}</p>
                    <p className="font-semibold">{product.formattedPrice} <span className="text-xs font-normal text-muted-foreground">(referencial)</span></p>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">Ver producto <ChevronRight className="h-4 w-4" /></span>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
