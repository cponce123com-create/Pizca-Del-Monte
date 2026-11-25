import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

const querySchema = z.object({
  orderId: z.string().cuid().optional(),
  type: z.enum(['INVOICE', 'RECEIPT', 'CREDIT_NOTE', 'DEBIT_NOTE', 'DELIVERY_NOTE', 'ALL']).optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
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

    const { orderId, type, status, page, limit, dateFrom, dateTo } = parsed.data;
    const skip = (page - 1) * limit;

    const isAdmin = (session.user as any).roles?.some((r: any) => ['SUPERADMIN', 'ADMIN', 'ACCOUNTING', 'SALES', 'SUPPORT'].includes(r.name));

    // Construir where
    const where: any = {};

    if (orderId) {
      // Verificar permisos para la orden
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { userId: true },
      });
      if (!order) {
        return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
      }
      if (order.userId !== session.user.id && !isAdmin) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      where.orderId = orderId;
    } else if (!isAdmin) {
      // Usuario normal solo ve sus propios documentos
      where.order = { userId: session.user.id };
    }

    if (type && type !== 'ALL') {
      where.type = type;
    }

    if (status) {
      where.sunatStatus = status;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              user: { select: { id: true, name: true, email: true } },
              Customer: { select: { id: true, firstName: true, lastName: true, documentNumber: true } },
            },
          },
        },
      }),
      prisma.document.count({ where }),
    ]);

    return NextResponse.json({
      documents: documents.map(d => ({
        id: d.id,
        type: d.type,
        series: d.series,
        number: d.number,
        sunatId: d.sunatId,
        sunatStatus: d.sunatStatus,
        sunatResponse: d.sunatResponse,
        pdfUrl: d.pdfUrl,
        createdAt: d.createdAt,
        signedAt: d.signedAt,
        sentAt: d.sentAt,
        voidedAt: d.voidedAt,
        voidReason: d.voidReason,
        order: d.order ? {
          id: d.order.id,
          orderNumber: d.order.orderNumber,
          customerName: d.order.Customer
            ? `${d.order.Customer.firstName} ${d.order.Customer.lastName}`
            : d.order.user?.name,
          customerDocument: d.order.Customer?.documentNumber,
        } : null,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}