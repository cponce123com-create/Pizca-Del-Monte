import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            user: true,
            Customer: true,
            items: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    // Verificar permisos
    const isAdmin = (session.user as any).roles?.some((r: any) => ['SUPERADMIN', 'ADMIN', 'ACCOUNTING', 'SALES'].includes(r.name));
    if (document.order?.userId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json({
      document: {
        id: document.id,
        type: document.type,
        series: document.series,
        number: document.number,
        sunatId: document.sunatId,
        sunatStatus: document.sunatStatus,
        sunatResponse: document.sunatResponse,
        pdfUrl: document.pdfUrl,
        xmlContent: document.xmlContent,
        cdrContent: document.cdrContent,
        createdAt: document.createdAt,
        signedAt: document.signedAt,
        sentAt: document.sentAt,
        voidedAt: document.voidedAt,
        voidReason: document.voidReason,
        metadata: document.metadata,
      },
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const isAdmin = (session.user as any).roles?.some((r: any) => ['SUPERADMIN', 'ADMIN', 'ACCOUNTING'].includes(r.name));
    if (!isAdmin) {
      return NextResponse.json({ error: 'Solo administradores pueden anular documentos' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json({ error: 'Debe proporcionar un motivo válido (mínimo 5 caracteres)' }, { status: 400 });
    }

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

    // Aquí se debería llamar a NubeFact para anular el documento
    // Por ahora solo marcamos como anulado localmente
    // En producción: llamar a NubeFactClient.voidDocument()

    const updated = await prisma.document.update({
      where: { id },
      data: {
        sunatStatus: 'ANULADO',
        voidedAt: new Date(),
        voidReason: reason,
        metadata: {
          ...(document.metadata as any),
          voidReason: reason,
          voidedBy: session.user.id,
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
        userId: session.user.id,
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