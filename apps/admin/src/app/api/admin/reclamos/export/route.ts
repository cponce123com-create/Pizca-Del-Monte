import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { z } from 'zod';

const querySchema = z.object({
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
});

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const { dateFrom, dateTo } = parsed.data;

    const complaints = await prisma.complaintBookEntry.findMany({
      where: {
        createdAt: {
          gte: new Date(dateFrom),
          lte: new Date(dateTo),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'EXPORT',
        entityType: 'ComplaintBookEntry',
        metadata: { dateFrom, dateTo, count: complaints.length },
      },
    });

    return NextResponse.json(complaints);
  } catch (error) {
    console.error('Error exporting complaints:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}