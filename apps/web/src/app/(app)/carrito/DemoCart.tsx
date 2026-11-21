'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { demoProducts } from '@/lib/demo-products';
import { readDemoCart, writeDemoCart, type DemoCartItem } from '@/lib/demo-cart';
import { formatPEN } from '@pizca/utils';
import { DemoProductImage } from '@/components/products/demo-product-image';

export function DemoCart() {
  const [items, setItems] = useState<DemoCartItem[]>([]);
  useEffect(() => { setItems(readDemoCart()); }, []);
  const update = (slug: string, quantity: number) => {
    const next = items.map(item => item.slug === slug ? { ...item, quantity: Math.min(99, quantity) } : item).filter(item => item.quantity > 0);
    setItems(next); writeDemoCart(next);
  };
  const rows = items.map(item => ({ item, product: demoProducts.find(product => product.slug === item.slug) })).filter(row => row.product);
  const total = rows.reduce((sum, row) => sum + row.product!.basePrice * row.item.quantity, 0);
  return <div className="container py-10"><h1 className="font-heading text-3xl font-semibold">Carrito de demostración</h1>
    <p className="mt-2 text-muted-foreground">Guardado solo en este navegador. Los precios son referenciales y no se procesan pagos.</p>
    {rows.length === 0 ? <p className="mt-8">Tu carrito está vacío. <Link className="underline" href="/tienda">Explorar productos</Link></p> : <div className="mt-8 grid gap-8 lg:grid-cols-3"><div className="space-y-4 lg:col-span-2">{rows.map(({ item, product }) => product && <article key={item.slug} className="flex gap-4 rounded-xl border p-4"><div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg"><DemoProductImage name={product.name} category={product.categories[0].name} /></div><div className="flex-1"><Link href={`/producto/${product.slug}`} className="font-semibold underline">{product.name}</Link><p>{formatPEN(product.basePrice)} por unidad</p><div className="mt-2 flex items-center gap-3"><button aria-label={`Reducir ${product.name}`} onClick={() => update(item.slug, item.quantity - 1)} className="rounded border px-3">−</button><span>{item.quantity}</span><button aria-label={`Aumentar ${product.name}`} disabled={item.quantity >= 99} onClick={() => update(item.slug, item.quantity + 1)} className="rounded border px-3">+</button><button onClick={() => update(item.slug, 0)} className="ml-auto underline">Eliminar</button></div></div></article>)}</div><aside className="h-fit rounded-xl border p-5"><p className="font-semibold">Subtotal referencial</p><p className="mt-2 text-2xl">{formatPEN(total)}</p><p className="mt-4 text-sm text-muted-foreground">El pago y el envío se habilitarán cuando la tienda esté configurada.</p><Link href="/tienda" className="mt-4 inline-block underline">Seguir explorando</Link></aside></div>}
  </div>;
}
