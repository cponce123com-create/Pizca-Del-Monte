import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { z } from 'zod';

const querySchema = z.object({
  q: z.string().trim().min(1).max(120),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos' },
        { status: 400 }
      );
    }

    const { q, limit } = parsed.data;

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
        ],
        status: { not: 'ARCHIVED' },
      },
      take: limit,
      include: {
        media: { where: { isPrimary: true }, take: 1 },
        brand: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(products.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      basePrice: p.basePrice,
      compareAtPrice: p.compareAtPrice,
      media: p.media,
      brand: p.brand,
    })));
  } catch (error) {
    console.error('Error searching products:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}