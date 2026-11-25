import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { z } from 'zod';

const schema = z.object({
  reason: z.string().trim().min(5, { message: 'Motivo mínimo 5 caracteres' }).max(500),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { reason } = parsed.data;

    const document = await prisma.document.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    if (document.sunatStatus === 'ANULADO') {
      return NextResponse.json({ error: 'El documento ya está anulado' }, { status: 400 });
    }

    if (document.sunatStatus !== 'ACEPTADO') {
      return NextResponse.json({ error: 'Solo se pueden anular documentos aceptados por SUNAT' }, { status: 400 });
    }

    // TODO: En producción, llamar a NubeFact para anular el documento
    // const nubefact = new NubeFactClient({...});
    // await nubefact.voidDocument(document.series, document.number, ...);

    // Marcar como anulado localmente
    const updated = await prisma.document.update({
      where: { id },
      data: {
        sunatStatus: 'ANULADO',
        voidedAt: new Date(),
        voidReason: reason,
        metadata: {
          ...(document.metadata as any),
          voidReason: reason,
          voidedBy: admin.id,
        },
      },
    });

    // Actualizar orden
    if (document.orderId) {
      await prisma.order.update({
        where: { id: document.orderId },
        data: {
          documentSunatStatus: 'ANULADO',
        },
      });
    }

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'VOID',
        entityType: 'Document',
        entityId: id,
        oldData: { sunatStatus: document.sunatStatus },
        newData: { sunatStatus: 'ANULADO', voidReason: reason },
      },
    });

    return NextResponse.json({
      success: true,
      document: updated,
      message: 'Documento anulado localmente. Recuerde enviar la anulación a SUNAT vía NubeFact.',
    });
  } catch (error) {
    console.error('Error voiding document:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}