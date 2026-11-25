import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { z } from 'zod';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().max(120).optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { page, limit, search, status, type, dateFrom, dateTo } = parsed.data;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { returnNumber: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
        { order: { user: { name: { contains: search, mode: 'insensitive' } } } },
        { order: { user: { email: { contains: search, mode: 'insensitive' } } } },
        { order: { Customer: { firstName: { contains: search, mode: 'insensitive' } } } },
        { order: { Customer: { lastName: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    if (status) where.status = status;
    if (type) where.type = type;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [returns, total] = await Promise.all([
      prisma.return.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: {
            select: {
              orderNumber: true,
              user: { select: { id: true, name: true, email: true } },
              Customer: { select: { id: true, firstName: true, lastName: true } },
            },
          },
          items: {
            select: {
              id: true,
              orderItemId: true,
              quantity: true,
              unitPrice: true,
              total: true,
              reason: true,
              condition: true,
              orderItem: { select: { name: true, variantName: true, productId: true } },
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
          ...i,
          unitPrice: Number(i.unitPrice),
          total: Number(i.total),
        })),
        createdAt: r.createdAt.toISOString(),
        processedAt: r.processedAt?.toISOString() || null,
        resolvedAt: r.resolvedAt?.toISOString() || null,
        selected: false,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (error) {
    console.error('Error fetching returns:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}