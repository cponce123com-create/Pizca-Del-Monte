import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetailClient } from './ProductDetailClient';
import { getProduct } from '@/lib/products';
import { isDemoMode } from '@/lib/demo-mode';

interface ProductDetailPageProps { params: Promise<{ slug: string }> }
export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: 'Producto no encontrado', robots: { index: false, follow: false } };
  const path = `/producto/${encodeURIComponent(product.slug)}`;
  return { title: product.metaTitle || product.name, description: product.metaDescription || product.shortDescription || undefined, alternates: { canonical: path }, openGraph: { title: product.name, description: product.shortDescription || undefined, url: path, images: product.media[0] ? [product.media[0].url] : [] }, ...(isDemoMode() ? { robots: { index: false, follow: false } } : {}) };
}
export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const structuredData = !isDemoMode() ? { '@context': 'https://schema.org', '@type': 'Product', name: product.name, sku: product.sku, description: product.shortDescription, image: product.media.map(image => image.url), offers: { '@type': 'Offer', price: product.basePrice, priceCurrency: 'PEN', availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' } } : null;
  return <>{structuredData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />}<ProductDetailClient initialProduct={product} /></>;
}
