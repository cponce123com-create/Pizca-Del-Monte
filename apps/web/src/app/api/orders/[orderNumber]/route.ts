import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { orderNumber } = await params;

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        user: { select: { id: true, name: true, email: true } },
        Customer: { select: { id: true, firstName: true, lastName: true, documentNumber: true, phone: true } },
        shippingAddressRel: {
          select: {
            firstName: true,
            lastName: true,
            addressLine1: true,
            addressLine2: true,
            district: true,
            province: true,
            department: true,
            phone: true,
          },
        },
        billingAddressRel: {
          select: {
            firstName: true,
            lastName: true,
            addressLine1: true,
            addressLine2: true,
            district: true,
            province: true,
            department: true,
            documentType: true,
            documentNumber: true,
          },
        },
        items: {
          select: {
            id: true,
            name: true,
            slug: true,
            quantity: true,
            unitPrice: true,
            total: true,
            variantName: true,
            imageUrl: true,
            productId: true,
          },
        },
        documents: {
          select: {
            id: true,
            type: true,
            series: true,
            number: true,
            sunatStatus: true,
            pdfUrl: true,
            xmlUrl: true,
            cdrUrl: true,
            createdAt: true,
          },
        },
        shipments: {
          select: {
            id: true,
            status: true,
            trackingNumber: true,
            carrier: { select: { name: true, code: true } },
            shippingAddress: true,
            createdAt: true,
            shippedAt: true,
            deliveredAt: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            provider: true,
            providerPaymentId: true,
            paymentMethod: true,
            createdAt: true,
            paidAt: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Verificar que el pedido pertenezca al usuario autenticado
    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        currency: order.currency,
        subtotal: Number(order.subtotal),
        discountAmount: Number(order.discountAmount),
        shippingAmount: Number(order.shippingAmount),
        taxAmount: Number(order.taxAmount),
        total: Number(order.total),
        paidAmount: Number(order.paidAmount),
        balanceDue: Number(order.balanceDue),
        paymentMethod: order.paymentMethod,
        paymentReference: order.paymentReference,
        shippingMethod: order.shippingMethod,
        shippingCarrier: order.shippingCarrier,
        shippingTracking: order.shippingTracking,
        estimatedDelivery: order.estimatedDelivery?.toISOString() || null,
        documentType: order.documentType,
        documentSeries: order.documentSeries,
        documentNumber: order.documentNumber,
        documentSunatStatus: order.documentSunatStatus,
        internalNotes: order.internalNotes,
        createdAt: order.createdAt.toISOString(),
        confirmedAt: order.confirmedAt?.toISOString() || null,
        shippedAt: order.shippedAt?.toISOString() || null,
        deliveredAt: order.deliveredAt?.toISOString() || null,
        cancelledAt: order.cancelledAt?.toISOString() || null,
        cancelledReason: order.cancelledReason,
        user: order.user,
        Customer: order.Customer,
        shippingAddressRel: order.shippingAddressRel,
        billingAddressRel: order.billingAddressRel,
        items: order.items.map(i => ({
          ...i,
          unitPrice: Number(i.unitPrice),
          total: Number(i.total),
        })),
        documents: order.documents,
        shipments: order.shipments,
        payments: order.payments.map(p => ({ ...p, amount: Number(p.amount) })),
      },
    });
  } catch (error) {
    console.error('Error fetching order detail:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}