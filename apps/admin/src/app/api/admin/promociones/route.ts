import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { z } from 'zod';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().max(120).optional(),
  status: z.enum(['active', 'inactive', 'expired', 'scheduled']).optional(),
  type: z.string().optional(),
  sort: z.string().default('startDate'),
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

    const { page, limit, search, status, type, sort, order } = parsed.data;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { couponCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    const now = new Date();
    if (status === 'active') {
      where.isActive = true;
      where.startDate = { lte: now };
      where.OR = [{ endDate: null }, { endDate: { gte: now } }];
    } else if (status === 'inactive') {
      where.isActive = false;
    } else if (status === 'expired') {
      where.isActive = true;
      where.endDate = { lt: now };
    } else if (status === 'scheduled') {
      where.isActive = true;
      where.startDate = { gt: now };
    }

    // Validate sort field
    const allowedSortFields = ['name', 'type', 'value', 'startDate', 'endDate', 'usageCount', 'createdAt'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'startDate';

    const [promotions, total] = await Promise.all([
      prisma.promotion.findMany({
        where,
        orderBy: { [sortField]: order },
        skip,
        take: limit,
        include: {
          _count: { select: { products: true } },
        },
      }),
      prisma.promotion.count({ where }),
    ]);

    return NextResponse.json({
      promotions,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

const createPromotionSchema = z.object({
  name: z.string().trim().min(1).max(180),
  slug: z.string().trim().max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(5000).optional(),
  type: z.enum(['PERCENTAGE_OFF', 'FIXED_AMOUNT_OFF', 'BUY_X_GET_Y', 'FREE_SHIPPING', 'GIFT_WITH_PURCHASE', 'VOLUME_DISCOUNT', 'TIME_LIMITED']),
  value: z.number().positive(),
  minOrderAmount: z.number().nonnegative().optional().nullable(),
  maxDiscount: z.number().nonnegative().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  perCustomerLimit: z.number().int().positive().optional().nullable(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
  priority: z.number().int().nonnegative().default(0),
  appliesToAll: z.boolean().default(false),
  requiresCoupon: z.boolean().default(false),
  couponCode: z.string().trim().max(40).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const body = await request.json();
    const parsed = createPromotionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const promotion = await prisma.$transaction(async (tx) => {
      const data = {
        ...parsed.data,
        startDate: new Date(parsed.data.startDate),
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        couponCode: parsed.data.couponCode || null,
      };

      const promo = await tx.promotion.create({ data });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: 'CREATE',
          entityType: 'Promotion',
          entityId: promo.id,
          newData: data,
        },
      });

      return promo;
    });

    return NextResponse.json(promotion, { status: 201 });
  } catch (error) {
    console.error('Error creating promotion:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una promoción con ese slug o código de cupón' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}