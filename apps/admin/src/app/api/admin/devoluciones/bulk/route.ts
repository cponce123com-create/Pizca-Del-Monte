import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { z } from 'zod';

const bulkSchema = z.object({
  action: z.enum(['approve', 'reject']),
  ids: z.array(z.string().uuid()).min(1).max(50),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const body = await request.json();
    const parsed = bulkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { action, ids } = parsed.data;

    const returns = await prisma.return.findMany({
      where: { id: { in: ids } },
      include: { items: true },
    });

    if (returns.length === 0) {
      return NextResponse.json({ error: 'No se encontraron devoluciones' }, { status: 404 });
    }

    const targetStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const validFromStatus = action === 'approve' ? 'PENDING' : ['PENDING', 'APPROVED'];

    // Filtrar solo las que se pueden actualizar
    const validReturns = returns.filter(r =>
      (typeof validFromStatus === 'string' ? r.status === validFromStatus : validFromStatus.includes(r.status))
    );

    if (validReturns.length === 0) {
      return NextResponse.json({ error: 'Ninguna devolución puede ser actualizada con esa acción' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (const ret of validReturns) {
        await tx.return.update({
          where: { id: ret.id },
          data: {
            status: targetStatus,
            processedAt: targetStatus === 'APPROVED' ? new Date() : undefined,
            adminNotes: `${ret.adminNotes || ''}\n[${new Date().toISOString()}] ${admin.id}: ${action === 'approve' ? 'Aprobada' : 'Rechazada'} masivamente`,
          },
        });

        await tx.returnStatusHistory.create({
          data: {
            returnId: ret.id,
            fromStatus: ret.status,
            toStatus: targetStatus,
            reason: `Acción masiva: ${action === 'approve' ? 'Aprobada' : 'Rechazada'}`,
            createdBy: admin.id,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: admin.id,
            action: 'BULK_UPDATE',
            entityType: 'Return',
            entityId: ret.id,
            oldData: { status: ret.status },
            newData: { status: targetStatus, bulkAction: action },
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      updated: validReturns.length,
      message: `${validReturns.length} devolución(es) ${action === 'approve' ? 'aprobada(s)' : 'rechazada(s)'}`,
    });
  } catch (error) {
    console.error('Error in bulk action:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}