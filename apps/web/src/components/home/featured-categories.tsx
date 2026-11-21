import Link from 'next/link';
import { demoCategories, demoProducts } from '@/lib/demo-products';
import { DemoProductImage } from '@/components/products/demo-product-image';

export function FeaturedCategories() {
  return <section className="container py-20" aria-labelledby="categories-heading">
    <div className="mb-10 flex items-center justify-between gap-4"><div><h2 id="categories-heading" className="font-heading text-3xl font-medium">Compra por categoría</h2><p className="mt-2 text-muted-foreground">Descubre ingredientes e ideas para tu cocina.</p></div><Link href="/tienda" className="text-primary underline">Ver todas</Link></div>
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">{demoCategories.map(category => {
      const product = demoProducts.find(item => item.categories.some(c => c.slug === category.slug));
      if (!product) return null;
      return <Link key={category.slug} href={`/tienda/categoria/${category.slug}`} className="group relative aspect-square overflow-hidden rounded-xl bg-muted"><DemoProductImage name={product.name} category={category.name} /><div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" /><h3 className="absolute bottom-4 left-4 right-4 font-semibold text-white">{category.name}</h3></Link>;
    })}</div>
  </section>;
}
