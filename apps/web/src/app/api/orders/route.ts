import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
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

    const { page, limit, status, dateFrom, dateTo } = parsed.data;
    const skip = (page - 1) * limit;

    const where: any = {
      userId: session.user.id,
    };

    if (status) where.status = status;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          items: {
            select: {
              id: true,
              name: true,
              slug: true,
              quantity: true,
              unitPrice: true,
              total: true,
              variantName: true,
              imageUrl: true,
              productId: true,
            },
          },
          documents: {
            select: {
              id: true,
              type: true,
              series: true,
              number: true,
              sunatStatus: true,
              pdfUrl: true,
            },
          },
          shipments: {
            select: {
              id: true,
              status: true,
              trackingNumber: true,
              carrier: { select: { name: true } },
              createdAt: true,
              deliveredAt: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders: orders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        currency: o.currency,
        subtotal: Number(o.subtotal),
        discountAmount: Number(o.discountAmount),
        shippingAmount: Number(o.shippingAmount),
        taxAmount: Number(o.taxAmount),
        total: Number(o.total),
        paidAmount: Number(o.paidAmount),
        balanceDue: Number(o.balanceDue),
        paymentMethod: o.paymentMethod,
        paymentReference: o.paymentReference,
        shippingMethod: o.shippingMethod,
        shippingCarrier: o.shippingCarrier,
        shippingTracking: o.shippingTracking,
        estimatedDelivery: o.estimatedDelivery?.toISOString() || null,
        documentType: o.documentType,
        documentSeries: o.documentSeries,
        documentNumber: o.documentNumber,
        documentSunatStatus: o.documentSunatStatus,
        createdAt: o.createdAt.toISOString(),
        confirmedAt: o.confirmedAt?.toISOString() || null,
        shippedAt: o.shippedAt?.toISOString() || null,
        deliveredAt: o.deliveredAt?.toISOString() || null,
        items: o.items.map(i => ({
          ...i,
          unitPrice: Number(i.unitPrice),
          total: Number(i.total),
        })),
        documents: o.documents,
        shipments: o.shipments,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}