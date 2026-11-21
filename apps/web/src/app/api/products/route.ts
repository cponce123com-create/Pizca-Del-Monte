import { logger } from '@/lib/logger';
import { isDemoMode } from '@/lib/demo-mode';
import { NextRequest, NextResponse } from 'next/server';
import { listProducts, productQuerySchema } from '@/lib/products';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const parsed = productQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: 'Parámetros inválidos', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    if (parsed.data.minPrice !== undefined && parsed.data.maxPrice !== undefined && parsed.data.minPrice > parsed.data.maxPrice) return NextResponse.json({ error: 'El precio mínimo no puede superar al máximo' }, { status: 400 });
    return NextResponse.json(await listProducts(parsed.data), { headers: { 'Cache-Control': isDemoMode() ? 'public, max-age=0, s-maxage=60, must-revalidate' : 'no-store' } });
  } catch (error) { logger.error('Error fetching products:', error); return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 }); }
}
