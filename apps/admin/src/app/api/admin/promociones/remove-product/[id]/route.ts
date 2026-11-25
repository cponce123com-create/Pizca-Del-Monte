import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.formData();
    const promotionId = body.get('promotionId') as string;

    if (!promotionId) {
      return NextResponse.json({ error: 'promotionId requerido' }, { status: 400 });
    }

    // Verify the link exists and belongs to the promotion
    const link = await prisma.promotionProduct.findUnique({
      where: { id },
    });

    if (!link || link.promotionId !== promotionId) {
      return NextResponse.json({ error: 'Relación no encontrada' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.promotionProduct.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: 'DELETE',
          entityType: 'PromotionProduct',
          entityId: promotionId,
          oldData: { id },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing promotion product:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}