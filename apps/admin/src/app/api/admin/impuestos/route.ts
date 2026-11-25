import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { z } from 'zod';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().max(120).optional(),
  status: z.enum(['active', 'inactive', 'expired']).optional(),
  type: z.string().optional(),
  sort: z.string().default('type'),
  order: z.enum(['asc', 'desc']).default('asc'),
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
        { name: { contains: search, mode: 'insensitive' } },
        { sunatCode: { contains: search, mode: 'insensitive' } },
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
    }

    const allowedSortFields = ['name', 'type', 'rate', 'startDate', 'endDate', 'createdAt'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'type';

    const [taxConfigs, total] = await Promise.all([
      prisma.taxConfiguration.findMany({
        where,
        orderBy: { [sortField]: order },
        skip,
        take: limit,
      }),
      prisma.taxConfiguration.count({ where }),
    ]);

    return NextResponse.json({
      taxConfigs,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    });
  } catch (error) {
    console.error('Error fetching tax configs:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

const createTaxConfigSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(['IGV', 'ISC', 'PERCEPCION', 'RETENCION', 'DETRACCION']),
  rate: z.number().positive(),
  isActive: z.boolean().default(true),
  appliesTo: z.array(z.string()).default([]),
  exemptions: z.array(z.string()).default([]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  sunatCode: z.string().trim().max(10).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const parsed = createTaxConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const taxConfig = await prisma.$transaction(async (tx) => {
      const data = {
        ...parsed.data,
        startDate: new Date(parsed.data.startDate),
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      };

      const config = await tx.taxConfiguration.create({ data });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: 'CREATE',
          entityType: 'TaxConfiguration',
          entityId: config.id,
          newData: data,
        },
      });

      return config;
    });

    return NextResponse.json(taxConfig, { status: 201 });
  } catch (error) {
    console.error('Error creating tax config:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una configuración con ese nombre' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}