import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetailClient } from './ProductDetailClient';
import { GET } from '@/app/api/products/[slug]/route';
import { NextRequest } from 'next/server';

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

  // Consultar directamente el manejador evita depender del dominio público durante SSR.
  const response = await GET(new NextRequest('http://localhost/api/products/' + encodeURIComponent(slug)), { params: Promise.resolve({ slug }) });

  if (!response.ok) {
    notFound();
  }

  const product = await response.json();

  return <ProductDetailClient initialProduct={product} />;
}