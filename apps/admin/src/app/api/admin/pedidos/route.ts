import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { z } from 'zod';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().max(120).optional(),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sort: z.string().default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
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

    const { page, limit, search, status, paymentStatus, dateFrom, dateTo, sort, order } = parsed.data;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { guestEmail: { contains: search, mode: 'insensitive' } },
        { Customer: { firstName: { contains: search, mode: 'insensitive' } } },
        { Customer: { lastName: { contains: search, mode: 'insensitive' } } },
        { Customer: { documentNumber: { contains: search, mode: 'insensitive' } } },
        { shippingTracking: { contains: search, mode: 'insensitive' } },
        { paymentReference: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;

    if (paymentStatus) {
      where.payments = { some: { status: paymentStatus } };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const allowedSortFields = ['orderNumber', 'createdAt', 'status', 'total', 'updatedAt'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt';

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { [sortField]: order },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          Customer: { select: { id: true, firstName: true, lastName: true, documentNumber: true } },
          items: { select: { id: true, name: true, quantity: true, unitPrice: true, total: true } },
          payments: { select: { id: true, amount: true, status: true, provider: true, createdAt: true } },
          shipments: { select: { id: true, status: true, trackingNumber: true, carrier: { select: { name: true } } } },
          documents: { select: { id: true, type: true, series: true, number: true, sunatStatus: true, pdfUrl: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders: orders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        userId: o.userId,
        guestEmail: o.guestEmail,
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
        user: o.user,
        Customer: o.Customer,
        items: o.items.map(i => ({ ...i, unitPrice: Number(i.unitPrice), total: Number(i.total) })),
        payments: o.payments.map(p => ({ ...p, amount: Number(p.amount) })),
        shipments: o.shipments,
        documents: o.documents,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}