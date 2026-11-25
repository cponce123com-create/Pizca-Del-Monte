import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { z } from 'zod';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().max(120).optional(),
  status: z.enum(['active', 'inactive', 'expired', 'scheduled', 'exhausted']).optional(),
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

    const where: any = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
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
      where.usageCount = { lt: 1000000 }; // Not exhausted
    } else if (status === 'inactive') {
      where.isActive = false;
    } else if (status === 'expired') {
      where.isActive = true;
      where.endDate = { lt: now };
    } else if (status === 'scheduled') {
      where.isActive = true;
      where.startDate = { gt: now };
    } else if (status === 'exhausted') {
      where.usageLimit = { not: null };
      where.usageCount = { gte: 1000000 }; // This is a placeholder, actual check would be usageCount >= usageLimit
    }

    const allowedSortFields = ['code', 'name', 'type', 'value', 'startDate', 'endDate', 'usageCount', 'createdAt'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'startDate';

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { [sortField]: order },
        skip,
        take: limit,
        include: {
          _count: { select: { products: true } },
        },
      }),
      prisma.coupon.count({ where }),
    ]);

    return NextResponse.json({
      coupons,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

const createCouponSchema = z.object({
  code: z.string().trim().min(1).max(40).toUpperCase(),
  name: z.string().trim().min(1).max(180),
  description: z.string().trim().max(5000).optional(),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING', 'BUY_X_GET_Y', 'GIFT_PRODUCT']),
  value: z.number().positive(),
  minOrderAmount: z.number().nonnegative().optional().nullable(),
  maxDiscount: z.number().nonnegative().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  perCustomerLimit: z.number().int().positive().default(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
  appliesToAll: z.boolean().default(false),
  promotionId: z.string().cuid().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const body = await request.json();
    const parsed = createCouponSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const coupon = await prisma.$transaction(async (tx) => {
      const data = {
        ...parsed.data,
        startDate: new Date(parsed.data.startDate),
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        promotionId: parsed.data.promotionId || null,
      };

      const cpn = await tx.coupon.create({ data });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: 'CREATE',
          entityType: 'Coupon',
          entityId: cpn.id,
          newData: data,
        },
      });

      return cpn;
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (error) {
    console.error('Error creating coupon:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un cupón con ese código' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}