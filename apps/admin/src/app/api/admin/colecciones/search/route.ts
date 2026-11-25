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
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const { q, limit } = parsed.data;

    const collections = await prisma.collection.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(collections);
  } catch (error) {
    console.error('Error searching collections:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}