import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED', 'PARTIAL_REFUND']),
  note: z.string().trim().max(1000).optional(),
  refundAmount: z.number().positive().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;

    const ret = await prisma.return.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            orderNumber: true,
            user: { select: { id: true, name: true, email: true } },
            Customer: { select: { id: true, firstName: true, lastName: true, phone: true, documentNumber: true } },
            shippingAddressRel: {
              select: {
                firstName: true,
                lastName: true,
                addressLine1: true,
                addressLine2: true,
                district: true,
                province: true,
                department: true,
              },
            },
            items: {
              select: {
                id: true,
                name: true,
                quantity: true,
                unitPrice: true,
                total: true,
                variantName: true,
                productId: true,
              },
            },
            payments: {
              select: { id: true, amount: true, status: true, provider: true, providerPaymentId: true },
            },
          },
        },
        items: {
          include: {
            orderItem: { select: { name: true, variantName: true, productId: true, quantity: true } },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!ret) {
      return NextResponse.json({ error: 'Devolución no encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      return: {
        id: ret.id,
        returnNumber: ret.returnNumber,
        orderId: ret.orderId,
        order: ret.order,
        status: ret.status,
        type: ret.type,
        reason: ret.reason,
        totalAmount: Number(ret.totalAmount),
        refundAmount: Number(ret.refundAmount),
        adminNotes: ret.adminNotes,
        items: ret.items.map(i => ({
          id: i.id,
          orderItemId: i.orderItemId,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          total: Number(i.total),
          reason: i.reason,
          condition: i.condition,
          orderItem: i.orderItem,
        })),
        statusHistory: ret.statusHistory.map(h => ({
          id: h.id,
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          reason: h.reason,
          createdBy: h.createdBy,
          createdAt: h.createdAt.toISOString(),
        })),
        createdAt: ret.createdAt.toISOString(),
        processedAt: ret.processedAt?.toISOString() || null,
        resolvedAt: ret.resolvedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Error fetching return detail:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status, note, refundAmount } = parsed.data;

    const ret = await prisma.return.findUnique({
      where: { id },
      include: { order: { include: { payments: true } } },
    });

    if (!ret) {
      return NextResponse.json({ error: 'Devolución no encontrada' }, { status: 404 });
    }

    if (ret.status === status) {
      return NextResponse.json({ error: 'La devolución ya tiene ese estado' }, { status: 400 });
    }

    // Validar transiciones de estado válidas
    const validTransitions: Record<string, string[]> = {
      APPROVED: ['PENDING'],
      REJECTED: ['PENDING', 'APPROVED'],
      RECEIVED: ['APPROVED'],
      REFUNDED: ['RECEIVED', 'APPROVED'],
      PARTIAL_REFUND: ['RECEIVED', 'APPROVED'],
    };

    if (validTransitions[status] && !validTransitions[status].includes(ret.status)) {
      return NextResponse.json({
        error: `No se puede cambiar de "${ret.status}" a "${status}"`,
      }, { status: 400 });
    }

    const updateData: any = {
      status,
      adminNotes: note ? `${ret.adminNotes || ''}\n[${new Date().toISOString()}] ${admin.id}: ${note}` : ret.adminNotes,
    };

    // Timestamps según estado
    if (status === 'APPROVED' && !ret.processedAt) updateData.processedAt = new Date();
    if (status === 'REFUNDED' && !ret.resolvedAt) updateData.resolvedAt = new Date();
    if (status === 'PARTIAL_REFUND' && !ret.resolvedAt) updateData.resolvedAt = new Date();
    if (refundAmount !== undefined) updateData.refundAmount = refundAmount;

    const updated = await prisma.$transaction(async (tx) => {
      // Actualizar devolución
      const updatedReturn = await tx.return.update({
        where: { id },
        data: updateData,
      });

      // Crear historial de estado
      await tx.returnStatusHistory.create({
        data: {
          returnId: id,
          fromStatus: ret.status,
          toStatus: status,
          reason: note,
          createdBy: admin.id,
        },
      });

      // Log de auditoría
      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: 'UPDATE',
          entityType: 'Return',
          entityId: id,
          oldData: { status: ret.status, refundAmount: Number(ret.refundAmount) },
          newData: { status, refundAmount: refundAmount ?? Number(ret.refundAmount), note },
        },
      });

      // Si se aprueba, notificar al cliente (aquí se integraría con el servicio de notificaciones)
      if (status === 'APPROVED') {
        // TODO: Enviar notificación al cliente con instrucciones de envío
      }

      // Si se marca como recibida, restaurar inventario si aplica
      if (status === 'RECEIVED') {
        for (const item of ret.items) {
          if (item.condition === 'NEW' || item.condition === 'OPENED') {
            if (item.orderItemId) {
              const orderItem = await tx.orderItem.findUnique({ where: { id: item.orderItemId } });
              if (orderItem) {
                if (orderItem.variantId) {
                  await tx.productVariant.update({
                    where: { id: orderItem.variantId },
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
                    where: { id: orderItem.productId },
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

                await tx.stockMovement.create({
                  data: {
                    productId: orderItem.productId,
                    variantId: orderItem.variantId,
                    type: 'RETURN',
                    quantity: item.quantity,
                    previousQty: 0,
                    newQty: 0,
                    referenceType: 'return_received',
                    referenceId: id,
                    performedBy: admin.id,
                    notes: `Devolución recibida: ${ret.returnNumber}, condición: ${item.condition}`,
                  },
                });
              }
            }
          }
        }
      }

      // Si se reembolsa, procesar el reembolso
      if (status === 'REFUNDED' || status === 'PARTIAL_REFUND') {
        const amountToRefund = refundAmount ?? Number(ret.refundAmount);

        // Buscar pago aprobado del pedido original
        const approvedPayment = ret.order.payments.find(p => p.status === 'APPROVED');
        if (approvedPayment) {
          // TODO: Integrar con gateway de pagos para procesar reembolso real
          // Por ahora solo registramos el reembolso
          await tx.payment.create({
            data: {
              orderId: ret.orderId,
              amount: amountToRefund,
              status: 'REFUNDED',
              provider: approvedPayment.provider,
              providerPaymentId: `REFUND-${ret.returnNumber}`,
              paymentMethod: 'REFUND',
              paidAt: new Date(),
            },
          });

          // Actualizar montos del pedido
          await tx.order.update({
            where: { id: ret.orderId },
            data: {
              paidAmount: { decrement: amountToRefund },
              balanceDue: { increment: amountToRefund },
              refundedAmount: { increment: amountToRefund },
            },
          });
        }
      }

      return updatedReturn;
    });

    return NextResponse.json({
      success: true,
      return: { id: updated.id, returnNumber: updated.returnNumber, status: updated.status },
      message: 'Estado actualizado correctamente',
    });
  } catch (error) {
    console.error('Error updating return:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}