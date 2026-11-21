import { Metadata } from 'next';
import { ProductCatalogClient } from './ProductCatalogClient';
import { listProducts, productQuerySchema } from '@/lib/products';

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
  const parsed = productQuerySchema.safeParse(params);
  if (!parsed.success || (parsed.data.minPrice !== undefined && parsed.data.maxPrice !== undefined && parsed.data.minPrice > parsed.data.maxPrice)) return <ProductCatalogClient initialParams={params} />;
  try {
    const initialData = await listProducts(parsed.data);
    return <ProductCatalogClient initialParams={params} initialData={initialData} />;
  } catch {
    return <ProductCatalogClient initialParams={params} />;
  }
}