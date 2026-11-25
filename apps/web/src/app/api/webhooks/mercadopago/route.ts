import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Webhook para notificaciones de Mercado Pago
 *
 * Eventos que maneja:
 * - payment.created
 * - payment.updated
 *
 * Estados de pago relevantes:
 * - approved: Pago aprobado
 * - pending: Pago pendiente
 * - rejected: Pago rechazado
 * - cancelled: Pago cancelado
 * - refunded: Pago reembolsado
 * - charged_back: Contracargo
 */

// Mapeo de estados de Mercado Pago a estados internos
const MERCADO_PAGO_STATUS_MAP: Record<string, { orderStatus: string; paymentStatus: string }> = {
  approved: { orderStatus: 'PAYMENT_CONFIRMED', paymentStatus: 'COMPLETED' },
  pending: { orderStatus: 'PENDING_PAYMENT', paymentStatus: 'PENDING' },
  in_process: { orderStatus: 'PENDING_PAYMENT', paymentStatus: 'PENDING' },
  rejected: { orderStatus: 'PAYMENT_FAILED', paymentStatus: 'FAILED' },
  cancelled: { orderStatus: 'CANCELLED', paymentStatus: 'CANCELLED' },
  refunded: { orderStatus: 'REFUNDED', paymentStatus: 'REFUNDED' },
  charged_back: { orderStatus: 'DISPUTED', paymentStatus: 'CHARGED_BACK' },
};

async function verifyWebhookSignature(request: NextRequest, body: string): Promise<boolean> {
  const signature = headers().get('x-signature');
  const requestId = headers().get('x-request-id');
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  if (!webhookSecret || !signature || !requestId) {
    // En desarrollo sin secret configurado, permitir (con advertencia)
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Webhook secret no configurado, saltando verificación de firma');
      return true;
    }
    return false;
  }

  // Verificar firma HMAC-SHA256
  // Formato: ts=timestamp,v1=hash
  const parts = signature.split(',');
  let timestamp = '';
  let hash = '';

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 'ts') timestamp = value;
    if (key === 'v1') hash = value;
  }

  const manifest = `id:${requestId};request-id:${requestId};ts:${timestamp};`;
  const crypto = await import('node:crypto');
  const expectedHash = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
}

async function handlePaymentNotification(paymentId: string) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado');
  }

  const client = new MercadoPagoConfig({ accessToken });
  const payment = new Payment(client);
  const mpPayment = await payment.get({ id: paymentId });

  // Buscar orden por external_reference (orderNumber)
  const orderNumber = mpPayment.external_reference;
  if (!orderNumber) {
    console.error('Payment sin external_reference:', paymentId);
    return { success: false, error: 'No external_reference' };
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      payment: true,
      shipment: true,
      items: true,
    },
  });

  if (!order) {
    console.error('Orden no encontrada:', orderNumber);
    return { success: false, error: 'Order not found' };
  }

  const mpStatus = mpPayment.status;
  const statusMap = MERCADO_PAGO_STATUS_MAP[mpStatus];

  if (!statusMap) {
    console.warn(`Estado de Mercado Pago no manejado: ${mpStatus}`);
    return { success: true, message: `Status ${mpStatus} not handled` };
  }

  const { orderStatus, paymentStatus } = statusMap;

  // Actualizar en transacción
  await prisma.$transaction(async (tx) => {
    // 1. Actualizar pago
    await tx.payment.update({
      where: { orderId: order.id },
      data: {
        status: paymentStatus as any,
        providerPaymentId: mpPayment.id?.toString(),
        providerData: mpPayment as any,
        paidAt: mpStatus === 'approved' ? new Date(mpPayment.date_approved || new Date()) : null,
        failureReason: mpStatus === 'rejected' ? mpPayment.status_detail : null,
      },
    });

    // 2. Actualizar orden
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: orderStatus as any,
        paidAmount: mpStatus === 'approved' ? order.total : '0',
        balanceDue: mpStatus === 'approved' ? '0' : order.total,
      },
    });

    // 3. Crear historial de estado si cambió
    if (order.status !== orderStatus) {
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: orderStatus as any,
          reason: `Actualización desde Mercado Pago: ${mpStatus}`,
          metadata: { providerPaymentId: mpPayment.id?.toString(), providerStatus: mpStatus },
        },
      });
    }

    // 4. Si pago aprobado, actualizar envío y descontar inventario
    if (mpStatus === 'approved') {
      // Actualizar envío a READY_FOR_PICKUP o PROCESSING
      if (order.shipment) {
        await tx.shipment.update({
          where: { id: order.shipment.id },
          data: { status: 'PROCESSING' },
        });
      }

      // Descontar inventario de variantes
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              inventory: {
                update: {
                  availableQty: { decrement: item.quantity },
                  reservedQty: { decrement: item.quantity },
                },
              },
            },
          });
        } else if (item.productId) {
          // Producto sin variante
          await tx.product.update({
            where: { id: item.productId },
            data: {
              inventory: {
                update: {
                  availableQty: { decrement: item.quantity },
                  reservedQty: { decrement: item.quantity },
                },
              },
            },
          });
        }
      }

      // 5. Crear factura/boleta pendiente (NubeFact)
      // TODO: Integrar con NubeFact para generar documento
      console.log(`Pago aprobado para orden ${orderNumber}, listo para facturación`);
    }

    // 6. Si reembolsado, crear nota de crédito
    if (mpStatus === 'refunded') {
      console.log(`Reembolso detectado para orden ${orderNumber}, generar nota de crédito`);
      // TODO: Integrar con NubeFact para nota de crédito
    }
  });

  return { success: true, orderNumber, status: mpStatus };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Verificar firma del webhook
    const isValid = await verifyWebhookSignature(request, body);
    if (!isValid) {
      console.error('Firma de webhook inválida');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(body);

    // Mercado Pago envía notificaciones con estructura:
    // { action: 'payment.created', data: { id: '12345' }, type: 'payment' }
    const { action, data, type } = payload;

    if (type !== 'payment' || !data?.id) {
      console.log('Notificación no es de pago, ignorando:', type);
      return NextResponse.json({ received: true });
    }

    const paymentId = data.id.toString();
    console.log(`Procesando notificación de pago: ${action} - ${paymentId}`);

    const result = await handlePaymentNotification(paymentId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error procesando webhook de Mercado Pago:', error);
    // Responder 200 para que Mercado Pago no reintente indefinidamente
    // pero loguear el error para investigación
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// GET para verificación manual / health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Mercado Pago Webhook',
    timestamp: new Date().toISOString(),
  });
}