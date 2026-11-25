import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { page, limit, status } = parsed.data;
    const skip = (page - 1) * limit;

    const where: any = {
      userId: session.user.id,
    };

    if (status) where.status = status;

    const [returns, total] = await Promise.all([
      prisma.return.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: { select: { orderNumber: true } },
          items: {
            include: {
              orderItem: { select: { name: true, variantName: true } },
            },
          },
        },
      }),
      prisma.return.count({ where }),
    ]);

    return NextResponse.json({
      returns: returns.map(r => ({
        id: r.id,
        returnNumber: r.returnNumber,
        orderId: r.orderId,
        order: r.order,
        status: r.status,
        type: r.type,
        reason: r.reason,
        totalAmount: Number(r.totalAmount),
        refundAmount: Number(r.refundAmount),
        items: r.items.map(i => ({
          id: i.id,
          orderItemId: i.orderItemId,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          total: Number(i.total),
          reason: i.reason,
          condition: i.condition,
          orderItem: i.orderItem,
        })),
        createdAt: r.createdAt.toISOString(),
        processedAt: r.processedAt?.toISOString() || null,
        resolvedAt: r.resolvedAt?.toISOString() || null,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (error) {
    console.error('Error fetching customer returns:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}