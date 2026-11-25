import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, payments: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Solo permitir cancelar si el pedido está en estados permitidos
    const cancellableStatuses = ['PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'PREPARING'];
    if (!cancellableStatuses.includes(order.status)) {
      return NextResponse.json(
        { error: `No se puede cancelar un pedido en estado ${order.status}` },
        { status: 400 }
      );
    }

    // Verificar si ya tiene pagos aprobados
    const hasApprovedPayment = order.payments.some(p => p.status === 'APPROVED');
    if (hasApprovedPayment && order.status !== 'PENDING_PAYMENT') {
      return NextResponse.json(
        { error: 'Este pedido tiene pagos aprobados. Contacte soporte para cancelación y reembolso.' },
        { status: 400 }
      );
    }

    // Cancelar el pedido en una transacción
    await prisma.$transaction(async (tx) => {
      // Restaurar inventario
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              inventory: {
                update: {
                  quantity: { increment: item.quantity },
                  availableQty: { increment: item.quantity },
                },
              },
            },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              inventory: {
                update: {
                  quantity: { increment: item.quantity },
                  availableQty: { increment: item.quantity },
                },
              },
            },
          });
        }

        // Registrar movimiento de stock
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            type: 'RETURN',
            quantity: item.quantity,
            previousQty: 0,
            newQty: 0,
            referenceType: 'order_cancellation',
            referenceId: order.id,
            performedBy: session.user.id,
            notes: `Cancelación por cliente: ${order.orderNumber}`,
          },
        });
      }

      // Actualizar estado del pedido
      await tx.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledReason: 'Cancelado por el cliente',
        },
      });

      // Crear historial de estado
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: order.status,
          toStatus: 'CANCELLED',
          reason: 'Cancelado por el cliente',
          createdBy: session.user.id,
        },
      });

      // Log de auditoría
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CANCEL',
          entityType: 'Order',
          entityId: id,
          oldData: { status: order.status },
          newData: { status: 'CANCELLED', cancelledBy: 'customer' },
        },
      });

      // Si hay pagos pendientes, marcarlos como cancelados
      await tx.payment.updateMany({
        where: { orderId: id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Pedido cancelado correctamente',
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}