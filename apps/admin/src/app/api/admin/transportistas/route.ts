import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { z } from 'zod';

const querySchema = z.object({
  include: z.enum(['carriers', 'zones', 'rates', 'rules']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
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

    const { include, page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    if (include === 'carriers') {
      const [carriers, total] = await Promise.all([
        prisma.carrier.findMany({
          orderBy: { priority: 'desc' },
          skip,
          take: limit,
          include: {
            _count: { select: { zones: true, shipments: true, rules: true } },
          },
        }),
        prisma.carrier.count(),
      ]);
      return NextResponse.json({ carriers, page, limit, total, totalPages: Math.ceil(total / limit) });
    }

    if (include === 'zones') {
      const [zones, total] = await Promise.all([
        prisma.shippingZone.findMany({
          orderBy: { name: 'asc' },
          skip,
          take: limit,
          include: {
            carrier: { select: { id: true, name: true, code: true } },
            _count: { select: { rates: true, rules: true } },
          },
        }),
        prisma.shippingZone.count(),
      ]);
      return NextResponse.json({ zones, page, limit, total, totalPages: Math.ceil(total / limit) });
    }

    if (include === 'rates') {
      const [rates, total] = await Promise.all([
        prisma.shippingRate.findMany({
          orderBy: { sortOrder: 'asc' },
          skip,
          take: limit,
          include: {
            zone: { select: { id: true, name: true, carrierId: true } },
          },
        }),
        prisma.shippingRate.count(),
      ]);
      return NextResponse.json({ rates, page, limit, total, totalPages: Math.ceil(total / limit) });
    }

    if (include === 'rules') {
      const [rules, total] = await Promise.all([
        prisma.shippingRule.findMany({
          orderBy: { priority: 'desc' },
          skip,
          take: limit,
          include: {
            product: { select: { id: true, name: true } },
            variant: { select: { id: true, name: true, sku: true } },
            category: { select: { id: true, name: true } },
            carrier: { select: { id: true, name: true, code: true } },
            zone: { select: { id: true, name: true } },
          },
        }),
        prisma.shippingRule.count(),
      ]);
      return NextResponse.json({ rules, page, limit, total, totalPages: Math.ceil(total / limit) });
    }

    // Default: return carriers with full structure
    const carriers = await prisma.carrier.findMany({
      orderBy: { priority: 'desc' },
      include: {
        zones: {
          include: {
            rates: { orderBy: { sortOrder: 'asc' } },
            _count: { select: { rates: true, rules: true } },
          },
        },
        _count: { select: { zones: true, shipments: true, rules: true } },
      },
    });

    return NextResponse.json({ carriers });
  } catch (error) {
    console.error('Error fetching transport data:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

const carrierSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  code: z.string().trim().min(1).max(20).toUpperCase(),
  type: z.enum(['courier', 'postal', 'pickup', 'own']).default('courier'),
  apiEndpoint: z.string().url().optional().nullable(),
  apiKey: z.string().trim().optional().nullable(),
  apiSecret: z.string().trim().optional().nullable(),
  trackingUrl: z.string().url().optional().nullable(),
  supportsPickup: z.boolean().default(false),
  supportsDropoff: z.boolean().default(false),
  maxWeight: z.number().positive().optional().nullable(),
  maxDimensions: z.any().optional().nullable(),
  isActive: z.boolean().default(true),
  priority: z.number().int().nonnegative().default(0),
  config: z.any().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const parsed = carrierSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const carrier = await prisma.$transaction(async (tx) => {
      const result = await tx.carrier.create({ data: parsed.data });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: 'CREATE',
          entityType: 'Carrier',
          entityId: result.id,
          newData: parsed.data,
        },
      });

      return result;
    });

    return NextResponse.json(carrier, { status: 201 });
  } catch (error) {
    console.error('Error creating carrier:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un transportista con ese slug o código' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}