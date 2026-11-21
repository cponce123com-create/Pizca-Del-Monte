'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { demoProducts } from '@/lib/demo-products';
import { DemoProductImage } from '@/components/products/demo-product-image';

export function DemoFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    try { const value = JSON.parse(localStorage.getItem('pizca-favorites') || '[]'); setIds(Array.isArray(value) ? value.filter(id => typeof id === 'string') : []); } catch { setIds([]); }
  }, []);
  const remove = (id: string) => { const next = ids.filter(item => item !== id); setIds(next); localStorage.setItem('pizca-favorites', JSON.stringify(next)); };
  const products = demoProducts.filter(product => ids.includes(product.id));
  return <div className="container py-12"><h1 className="font-heading text-3xl font-semibold">Mis favoritos</h1><p className="mt-3 text-muted-foreground">Productos de demostración guardados solo en este navegador.</p>
    {products.length === 0 ? <p className="mt-8">Aún no tienes productos guardados. <Link className="underline" href="/tienda">Explorar tienda</Link></p> : <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.map(product => <article key={product.id} className="overflow-hidden rounded-xl border"><Link href={`/producto/${product.slug}`}><div className="aspect-square bg-muted"><DemoProductImage name={product.name} category={product.categories[0].name} /></div><div className="p-4"><h2 className="font-semibold">{product.name}</h2><p className="mt-2">{product.formattedPrice}</p></div></Link><button onClick={() => remove(product.id)} className="px-4 pb-4 text-sm underline">Quitar de favoritos</button></article>)}</div>}
  </div>;
}
