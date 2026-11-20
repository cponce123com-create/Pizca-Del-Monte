import { Metadata } from 'next';
import { ProductCatalogClient } from './ProductCatalogClient';

export const metadata: Metadata = {
  title: 'Tienda - Pizca del Monte',
  description: 'Descubre nuestra selección de especias, sales, aceites y productos gourmet peruanos.',
};

interface ProductCatalogPageProps {
  searchParams: Promise<{
    page?: string;
    sort?: string;
    category?: string;
    brand?: string;
    minPrice?: string;
    maxPrice?: string;
    search?: string;
    inStock?: string;
    featured?: string;
    onSale?: string;
  }>;
}

export default async function ProductCatalogPage({ searchParams }: ProductCatalogPageProps) {
  const params = await searchParams;
  return <ProductCatalogClient initialParams={params} />;
}