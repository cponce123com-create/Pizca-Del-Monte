import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetailClient } from './ProductDetailClient';

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Producto - ${slug}`,
    description: 'Ver detalles del producto',
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;

  // Fetch product data server-side for SEO
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/products/${slug}`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    notFound();
  }

  const product = await response.json();

  return <ProductDetailClient initialProduct={product} />;
}