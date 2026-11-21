import { logger } from '@/lib/logger';
import { isDemoMode } from '@/lib/demo-mode';
import { NextRequest, NextResponse } from 'next/server';
import { getProduct } from '@/lib/products';
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const product = await getProduct(slug);
    return product ? NextResponse.json(product, { headers: { 'Cache-Control': isDemoMode() ? 'public, max-age=0, s-maxage=60, must-revalidate' : 'no-store' } }) : NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
  } catch (error) { logger.error('Error fetching product:', error); return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 }); }
}
