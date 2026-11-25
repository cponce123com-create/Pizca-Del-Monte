import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { z } from 'zod';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().max(120).optional(),
  type: z.string().optional(),
  status: z.string().optional(),
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

    const { page, limit, search, type, status, dateFrom, dateTo, sort, order } = parsed.data;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { series: { contains: search, mode: 'insensitive' } },
        { number: { equals: parseInt(search) || undefined } },
        { sunatId: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
        { order: { user: { name: { contains: search, mode: 'insensitive' } } } },
        { order: { Customer: { firstName: { contains: search, mode: 'insensitive' } } } },
        { order: { Customer: { lastName: { contains: search, mode: 'insensitive' } } } },
        { order: { Customer: { documentNumber: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    if (type) where.type = type;
    if (status) where.sunatStatus = status;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const allowedSortFields = ['series', 'number', 'createdAt', 'sunatStatus', 'type'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt';

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { [sortField]: order },
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
        xmlContent: d.xmlContent,
        cdrContent: d.cdrContent,
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