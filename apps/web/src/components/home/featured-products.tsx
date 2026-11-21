import Link from 'next/link';
import { demoProducts } from '@/lib/demo-products';
import { DemoProductImage } from '@/components/products/demo-product-image';

export function FeaturedProducts() {
  const products = demoProducts.filter(product => product.isFeatured).slice(0, 4);
  return <section className="container py-20" aria-labelledby="products-heading">
    <div className="mb-10 flex items-center justify-between gap-4"><div><h2 id="products-heading" className="font-heading text-3xl font-medium">Productos destacados</h2><p className="mt-2 text-muted-foreground">Explora nuestra selección referencial.</p></div><Link href="/tienda" className="text-primary underline">Ver catálogo</Link></div>
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{products.map(product => <Link key={product.id} href={`/producto/${product.slug}`} className="group overflow-hidden rounded-xl border bg-card">
      <div className="aspect-square bg-muted"><DemoProductImage name={product.name} category={product.categories[0].name} /></div><div className="p-4"><p className="text-sm text-muted-foreground">{product.brand.name} · {product.categories[0].name}</p><h3 className="mt-2 font-semibold group-hover:text-primary">{product.name}</h3><p className="mt-2 text-sm text-muted-foreground">{product.shortDescription}</p><p className="mt-4 font-semibold">{product.formattedPrice}</p></div>
    </Link>)}</div>
  </section>;
}
