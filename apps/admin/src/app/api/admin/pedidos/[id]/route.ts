import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { z } from 'zod';

const statusSchema = z.object({
  status: z.enum([
    'PENDING_PAYMENT',
    'PAYMENT_CONFIRMED',
    'PREPARING',
    'READY_TO_SHIP',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED',
    'PARTIALLY_REFUNDED',
    'ON_HOLD',
    'DISPUTED',
  ]),
  note: z.string().trim().max(1000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = statusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status, note } = parsed.data;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    if (order.status === status) {
      return NextResponse.json({ error: 'El pedido ya tiene ese estado' }, { status: 400 });
    }

    // Validaciones de transición de estado
    const invalidTransitions: Record<string, string[]> = {
      DELIVERED: ['PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'PREPARING', 'READY_TO_SHIP'],
      REFUNDED: ['PENDING_PAYMENT', 'PREPARING', 'READY_TO_SHIP'],
      CANCELLED: ['DELIVERED', 'REFUNDED'],
    };

    if (invalidTransitions[status]?.includes(order.status)) {
      return NextResponse.json({
        error: `No se puede cambiar de "${order.status}" a "${status}"`,
      }, { status: 400 });
    }

    // Si se cancela, restaurar inventario
    if (status === 'CANCELLED' && ['PAYMENT_CONFIRMED', 'PREPARING', 'READY_TO_SHIP'].includes(order.status)) {
      await prisma.$transaction(async (tx) => {
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
              previousQty: 0, // Se calcularía en trigger real
              newQty: 0,
              referenceType: 'order_cancellation',
              referenceId: order.id,
              performedBy: admin.id,
              notes: `Cancelación de pedido ${order.orderNumber}: ${note || 'Sin motivo'}`,
            },
          });
        }
      });
    }

    // Actualizar pedido
    const updateData: any = {
      status,
      internalNotes: note ? `${order.internalNotes || ''}\n[${new Date().toISOString()}] ${admin.id}: ${note}` : order.internalNotes,
    };

    // Timestamps según estado
    if (status === 'PAYMENT_CONFIRMED' && !order.confirmedAt) updateData.confirmedAt = new Date();
    if (status === 'SHIPPED' && !order.shippedAt) updateData.shippedAt = new Date();
    if (status === 'DELIVERED' && !order.deliveredAt) updateData.deliveredAt = new Date();
    if (status === 'CANCELLED' && !order.cancelledAt) {
      updateData.cancelledAt = new Date();
      updateData.cancelledReason = note;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    // Crear historial de estado
    await prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: order.status,
        toStatus: status,
        reason: note,
        createdBy: admin.id,
      },
    });

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'UPDATE',
        entityType: 'Order',
        entityId: id,
        oldData: { status: order.status },
        newData: { status, note },
      },
    });

    // Si se marca como entregado y no tiene documento, sugerir generar
    let message = 'Estado actualizado correctamente';
    if (status === 'DELIVERED' && !order.documentSeries) {
      message += '. El pedido está entregado pero no tiene documento electrónico generado.';
    }

    return NextResponse.json({
      success: true,
      order: { id: updated.id, orderNumber: updated.orderNumber, status: updated.status },
      message,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}