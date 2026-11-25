// Notification System for Pizca del Monte
// Supports Email (SMTP/Resend), SMS (Twilio/Provider), WhatsApp, Push, In-App

import { prisma } from '@pizca/database';
import { Decimal } from 'decimal.js';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH' | 'IN_APP';
export type NotificationType =
  | 'ORDER_CONFIRMED'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'REFUND_PROCESSED'
  | 'LOW_STOCK'
  | 'BACK_IN_STOCK'
  | 'PRICE_DROP'
  | 'NEW_RECIPE'
  | 'PROMOTION'
  | 'NEWSLETTER'
  | 'SUPPORT_TICKET'
  | 'REVIEW_REQUEST'
  | 'INVOICE_READY'
  | 'ORDER_CANCELLED';

export interface NotificationTemplate {
  subject: string;
  html: string;
  text: string;
  sms?: string;
  whatsapp?: string;
}

export interface NotificationPayload {
  userId?: string;
  customerId?: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  data?: Record<string, any>;
  templateId?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: Date;
}

// Email Provider Interface
export interface EmailProvider {
  send(to: string | string[], subject: string, html: string, text: string, attachments?: EmailAttachment[]): Promise<EmailResult>;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// SMS Provider Interface
export interface SMSProvider {
  send(to: string, message: string): Promise<SMSResult>;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// WhatsApp Provider Interface
export interface WhatsAppProvider {
  send(to: string, templateName: string, parameters: Record<string, string>, mediaUrl?: string): Promise<WhatsAppResult>;
}

export interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Notification Service
export class NotificationService {
  private emailProvider: EmailProvider | null = null;
  private smsProvider: SMSProvider | null = null;
  private whatsappProvider: WhatsAppProvider | null = null;
  private defaultFromEmail: string;
  private defaultFromName: string;

  constructor(config: {
    emailProvider?: EmailProvider;
    smsProvider?: SMSProvider;
    whatsappProvider?: WhatsAppProvider;
    defaultFromEmail: string;
    defaultFromName: string;
  }) {
    this.emailProvider = config.emailProvider || null;
    this.smsProvider = config.smsProvider || null;
    this.whatsappProvider = config.whatsappProvider || null;
    this.defaultFromEmail = config.defaultFromEmail;
    this.defaultFromName = config.defaultFromName;
  }

  setEmailProvider(provider: EmailProvider) {
    this.emailProvider = provider;
  }

  setSMSProvider(provider: SMSProvider) {
    this.smsProvider = provider;
  }

  setWhatsAppProvider(provider: WhatsAppProvider) {
    this.whatsappProvider = provider;
  }

  async sendNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      // Crear registro en BD
      const notification = await prisma.notification.create({
        data: {
          userId: payload.userId,
          customerId: payload.customerId,
          type: payload.type,
          channel: payload.channel,
          title: payload.title,
          message: payload.message,
          data: payload.data,
          sentAt: payload.scheduledAt || new Date(),
        },
      });

      // Enviar según canal
      let result = false;
      switch (payload.channel) {
        case 'EMAIL':
          result = await this.sendEmail(payload);
          break;
        case 'SMS':
          result = await this.sendSMS(payload);
          break;
        case 'WHATSAPP':
          result = await this.sendWhatsApp(payload);
          break;
        case 'PUSH':
          result = await this.sendPush(payload);
          break;
        case 'IN_APP':
          result = true; // Ya se guardó en BD
          break;
      }

      // Actualizar estado
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: result ? 'SENT' : 'FAILED',
          sentAt: result ? new Date() : null,
          error: result ? null : 'Error enviando notificación',
        },
      });

      return result;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  async sendEmail(payload: NotificationPayload): Promise<boolean> {
    if (!this.emailProvider) {
      console.warn('No email provider configured');
      return false;
    }

    try {
      // Obtener email del usuario/cliente
      let toEmail = '';
      if (payload.userId) {
        const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { email: true } });
        toEmail = user?.email || '';
      } else if (payload.customerId) {
        const customer = await prisma.customer.findUnique({ where: { id: payload.customerId }, select: { email: true } });
        toEmail = customer?.email || '';
      }

      if (!toEmail) return false;

      const result = await this.emailProvider.send(
        toEmail,
        payload.title,
        payload.message, // HTML
        payload.data?.text || payload.message.replace(/<[^>]*>/g, ''), // Text version
        payload.data?.attachments
      );

      return result.success;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendSMS(payload: NotificationPayload): Promise<boolean> {
    if (!this.smsProvider) {
      console.warn('No SMS provider configured');
      return false;
    }

    try {
      let toPhone = '';
      if (payload.userId) {
        const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { phone: true } });
        toPhone = user?.phone || '';
      } else if (payload.customerId) {
        const customer = await prisma.customer.findUnique({ where: { id: payload.customerId }, select: { phone: true } });
        toPhone = customer?.phone || '';
      }

      if (!toPhone) return false;

      const result = await this.smsProvider.send(toPhone, payload.data?.sms || payload.message);
      return result.success;
    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  }

  async sendWhatsApp(payload: NotificationPayload): Promise<boolean> {
    if (!this.whatsappProvider) {
      console.warn('No WhatsApp provider configured');
      return false;
    }

    try {
      let toPhone = '';
      if (payload.userId) {
        const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { phone: true } });
        toPhone = user?.phone || '';
      } else if (payload.customerId) {
        const customer = await prisma.customer.findUnique({ where: { id: payload.customerId }, select: { phone: true } });
        toPhone = customer?.phone || '';
      }

      if (!toPhone) return false;

      const result = await this.whatsappProvider.send(
        toPhone,
        payload.data?.whatsappTemplate || 'default',
        payload.data?.whatsappParams || {}
      );
      return result.success;
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      return false;
    }
  }

  async sendPush(payload: NotificationPayload): Promise<boolean> {
    // Implementar con Firebase, OneSignal, etc.
    console.log('Push notification:', payload.title, payload.message);
    return true;
  }

  // Métodos de conveniencia para eventos comunes
  async notifyOrderConfirmed(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        Customer: true,
        items: { include: { product: true } },
        shippingAddressRel: true,
        documents: true,
      },
    });

    if (!order) return;

    const template = this.getOrderConfirmedTemplate(order);

    await this.sendNotification({
      userId: order.userId || undefined,
      customerId: order.Customer?.id,
      type: 'ORDER_CONFIRMED',
      channel: 'EMAIL',
      title: template.subject,
      message: template.html,
      data: { text: template.text, orderId: order.id, orderNumber: order.orderNumber },
    });

    // También SMS si tiene teléfono
    if (order.Customer?.phone || (await prisma.user.findUnique({ where: { id: order.userId! }, select: { phone: true } }))?.phone) {
      await this.sendNotification({
        userId: order.userId || undefined,
        customerId: order.Customer?.id,
        type: 'ORDER_CONFIRMED',
        channel: 'SMS',
        title: 'Pedido Confirmado',
        message: `Tu pedido ${order.orderNumber} ha sido confirmado. Total: ${new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(order.total))}`,
        data: { sms: `Pedido ${order.orderNumber} confirmado. Total: ${new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(order.total))}` },
      });
    }
  }

  async notifyOrderShipped(orderId: string, trackingNumber: string, carrierName: string, trackingUrl?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, Customer: true },
    });

    if (!order) return;

    const template = this.getOrderShippedTemplate(order, trackingNumber, carrierName, trackingUrl);

    await this.sendNotification({
      userId: order.userId || undefined,
      customerId: order.Customer?.id,
      type: 'ORDER_SHIPPED',
      channel: 'EMAIL',
      title: template.subject,
      message: template.html,
      data: { text: template.text, orderId: order.id, orderNumber: order.orderNumber, trackingNumber, carrierName, trackingUrl },
    });

    // SMS/WhatsApp con tracking
    await this.sendNotification({
      userId: order.userId || undefined,
      customerId: order.Customer?.id,
      type: 'ORDER_SHIPPED',
      channel: 'SMS',
      title: 'Pedido Enviado',
      message: `Tu pedido ${order.orderNumber} ha sido enviado por ${carrierName}. Tracking: ${trackingNumber}${trackingUrl ? ` ${trackingUrl}` : ''}`,
      data: { sms: `Pedido ${order.orderNumber} enviado por ${carrierName}. Tracking: ${trackingNumber}` },
    });
  }

  async notifyOrderDelivered(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, Customer: true, documents: true },
    });

    if (!order) return;

    const template = this.getOrderDeliveredTemplate(order);

    await this.sendNotification({
      userId: order.userId || undefined,
      customerId: order.Customer?.id,
      type: 'ORDER_DELIVERED',
      channel: 'EMAIL',
      title: template.subject,
      message: template.html,
      data: { text: template.text, orderId: order.id, orderNumber: order.orderNumber },
    });

    // Si tiene documento, adjuntar PDF
    const invoice = order.documents.find(d => d.type === 'INVOICE' || d.type === 'RECEIPT');
    if (invoice?.pdfUrl) {
      await this.sendNotification({
        userId: order.userId || undefined,
        customerId: order.Customer?.id,
        type: 'INVOICE_READY',
        channel: 'EMAIL',
        title: `Tu ${invoice.type === 'INVOICE' ? 'Factura' : 'Boleta'} está lista`,
        message: this.getInvoiceReadyTemplate(order, invoice).html,
        data: { text: this.getInvoiceReadyTemplate(order, invoice).text, pdfUrl: invoice.pdfUrl, attachments: [{ filename: `${invoice.series}-${invoice.number}.pdf`, content: invoice.pdfUrl, contentType: 'application/pdf' }] },
      });
    }
  }

  async notifyPaymentReceived(orderId: string, amount: Decimal, method: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, Customer: true },
    });

    if (!order) return;

    const template = this.getPaymentReceivedTemplate(order, amount, method);

    await this.sendNotification({
      userId: order.userId || undefined,
      customerId: order.Customer?.id,
      type: 'PAYMENT_RECEIVED',
      channel: 'EMAIL',
      title: template.subject,
      message: template.html,
      data: { text: template.text, orderId: order.id, orderNumber: order.orderNumber, amount: Number(amount), method },
    });
  }

  async notifyPaymentFailed(orderId: string, reason: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, Customer: true },
    });

    if (!order) return;

    const template = this.getPaymentFailedTemplate(order, reason);

    await this.sendNotification({
      userId: order.userId || undefined,
      customerId: order.Customer?.id,
      type: 'PAYMENT_FAILED',
      channel: 'EMAIL',
      title: template.subject,
      message: template.html,
      data: { text: template.text, orderId: order.id, orderNumber: order.orderNumber, reason },
    });
  }

  async notifyRefundProcessed(orderId: string, amount: Decimal, reason: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, Customer: true },
    });

    if (!order) return;

    const template = this.getRefundProcessedTemplate(order, amount, reason);

    await this.sendNotification({
      userId: order.userId || undefined,
      customerId: order.Customer?.id,
      type: 'REFUND_PROCESSED',
      channel: 'EMAIL',
      title: template.subject,
      message: template.html,
      data: { text: template.text, orderId: order.id, orderNumber: order.orderNumber, amount: Number(amount), reason },
    });
  }

  async notifyLowStock(productId: string, currentStock: number, minStock: number) {
    // Notificar a admins/warehouse
    const admins = await prisma.user.findMany({
      where: { roles: { some: { role: { name: { in: ['SUPERADMIN', 'ADMIN', 'WAREHOUSE'] } } } } },
      select: { id: true, email: true, phone: true },
    });

    for (const admin of admins) {
      await this.sendNotification({
        userId: admin.id,
        type: 'LOW_STOCK',
        channel: 'EMAIL',
        title: 'Stock Bajo - Acción Requerida',
        message: `El producto ${productId} tiene stock actual de ${currentStock} (mínimo: ${minStock}). Por favor reabastecer.`,
        data: { productId, currentStock, minStock },
      });
    }
  }

  // Templates
  private getOrderConfirmedTemplate(order: any): NotificationTemplate {
    const itemsHtml = order.items.map((item: any) =>
      `<tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}${item.variantName ? ` - ${item.variantName}` : ''}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(item.unitPrice))}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(item.total))}</td>
      </tr>`
    ).join('');

    const shipping = order.shippingAddressRel ? `
      <p><strong>Dirección de envío:</strong></p>
      <p>${order.shippingAddressRel.firstName} ${order.shippingAddressRel.lastName}<br>
      ${order.shippingAddressRel.addressLine1}${order.shippingAddressRel.addressLine2 ? `, ${order.shippingAddressRel.addressLine2}` : ''}<br>
      ${order.shippingAddressRel.district}, ${order.shippingAddressRel.province}, ${order.shippingAddressRel.department}</p>
    ` : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">¡Pedido Confirmado! 🎉</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 18px; margin-bottom: 20px;">Hola <strong>${order.Customer ? `${order.Customer.firstName} ${order.Customer.lastName}` : order.user?.name || 'Cliente'}</strong>,</p>
          <p>Tu pedido <strong style="color: #059669;">${order.orderNumber}</strong> ha sido confirmado y está siendo procesado.</p>

          <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; margin: 20px 0;">
            <thead>
              <tr style="background: #059669; color: white;">
                <th style="padding: 12px; text-align: left;">Producto</th>
                <th style="padding: 12px; text-align: center;">Cant.</th>
                <th style="padding: 12px; text-align: right;">Precio</th>
                <th style="padding: 12px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <span>Subtotal</span>
              <span>${new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(order.subtotal))}</span>
            </div>
            ${order.discountAmount > 0 ? `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #059669;">
              <span>Descuento</span>
              <span>-${new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(order.discountAmount))}</span>
            </div>` : ''}
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <span>Envío</span>
              <span>${order.shippingAmount === 0 ? '<span style="color: #059669;">Gratis</span>' : new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(order.shippingAmount))}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <span>IGV (18%)</span>
              <span>${new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(order.taxAmount))}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: bold;">
              <span>Total</span>
              <span>${new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(order.total))}</span>
            </div>
          </div>

          ${shipping ? `<div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">${shipping}</div>` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/orden/${order.orderNumber}" style="background: #059669; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Ver mi Pedido</a>
          </div>

          <p style="color: #6b7280; font-size: 14px; text-align: center;">Gracias por comprar en Pizca del Monte. Si tienes preguntas, responde a este correo.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
¡Pedido Confirmado!

Hola ${order.Customer ? `${order.Customer.firstName} ${order.Customer.lastName}` : order.user?.name || 'Cliente'},

Tu pedido ${order.orderNumber} ha sido confirmado.

Total: ${new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(order.total))}

Ver tu pedido: ${process.env.NEXT_PUBLIC_APP_URL}/orden/${order.orderNumber}

Gracias por comprar en Pizca del Monte.
    `.trim();

    return { subject: `✅ Pedido Confirmado - ${order.orderNumber}`, html, text };
  }

  private getOrderShippedTemplate(order: any, trackingNumber: string, carrierName: string, trackingUrl?: string): NotificationTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📦 ¡Tu Pedido ya viene en camino!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 18px; margin-bottom: 20px;">Hola <strong>${order.Customer ? `${order.Customer.firstName} ${order.Customer.lastName}` : order.user?.name || 'Cliente'}</strong>,</p>
          <p>Tu pedido <strong>${order.orderNumber}</strong> ha sido enviado.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Transportista:</strong> ${carrierName}</p>
            <p><strong>Número de tracking:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${trackingNumber}</code></p>
            ${trackingUrl ? `<p><a href="${trackingUrl}" style="color: #2563eb;">🔗 Rastrear mi envío</a></p>` : ''}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            ${trackingUrl ? `<a href="${trackingUrl}" style="background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Rastrear Envío</a>` : ''}
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/orden/${order.orderNumber}" style="background: #6b7280; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; margin-left: 10px;">Ver Pedido</a>
          </div>

          <p style="color: #6b7280; font-size: 14px; text-align: center;">Pizca del Monte - Envíos a todo el Perú</p>
        </div>
      </body>
      </html>
    `;

    const text = `
¡Tu Pedido ya viene en camino!

Hola ${order.Customer ? `${order.Customer.firstName} ${order.Customer.lastName}` : order.user?.name || 'Cliente'},

Tu pedido ${order.orderNumber} ha sido enviado por ${carrierName}.
Tracking: ${trackingNumber}
${trackingUrl ? `Rastrear: ${trackingUrl}` : ''}

Ver tu pedido: ${process.env.NEXT_PUBLIC_APP_URL}/orden/${order.orderNumber}

Pizca del Monte
    `.trim();

    return { subject: `📦 Pedido Enviado - ${order.orderNumber} (${carrierName})`, html, text };
  }

  private getOrderDeliveredTemplate(order: any): NotificationTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✅ ¡Pedido Entregado!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 18px; margin-bottom: 20px;">Hola <strong>${order.Customer ? `${order.Customer.firstName} ${order.Customer.lastName}` : order.user?.name || 'Cliente'}</strong>,</p>
          <p>Tu pedido <strong>${order.orderNumber}</strong> ha sido entregado exitosamente. ¡Esperamos que disfrutes tus productos!</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/orden/${order.orderNumber}" style="background: #059669; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; margin-right: 10px;">Ver Pedido</a>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/productos/${order.items[0]?.product?.slug || 'tienda'}/review" style="background: #f59e0b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Dejar Reseña ⭐</a>
          </div>

          <p style="color: #6b7280; font-size: 14px; text-align: center;">Gracias por confiar en Pizca del Monte. ¡Vuelve pronto!</p>
        </div>
      </body>
      </html>
    `;

    const text = `
¡Pedido Entregado!

Hola ${order.Customer ? `${order.Customer.firstName} ${order.Customer.lastName}` : order.user?.name || 'Cliente'},

Tu pedido ${order.orderNumber} ha sido entregado. ¡Esperamos que disfrutes tus productos!

Ver pedido: ${process.env.NEXT_PUBLIC_APP_URL}/orden/${order.orderNumber}

Gracias por confiar en Pizca del Monte.
    `.trim();

    return { subject: `✅ Pedido Entregado - ${order.orderNumber}`, html, text };
  }

  private getInvoiceReadyTemplate(order: any, invoice: any): NotificationTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📄 Tu ${invoice.type === 'INVOICE' ? 'Factura' : 'Boleta'} Electrónica</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 18px; margin-bottom: 20px;">Hola <strong>${order.Customer ? `${order.Customer.firstName} ${order.Customer.lastName}` : order.user?.name || 'Cliente'}</strong>,</p>
          <p>Tu ${invoice.type === 'INVOICE' ? 'factura' : 'boleta'} electrónica <strong>${invoice.series}-${String(invoice.number).padStart(8, '0')}</strong> para el pedido ${order.orderNumber} ha sido generada y aceptada por SUNAT.</p>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 10px 0; color: #6b7280;">Documento SUNAT</p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: #059669;">${invoice.series}-${String(invoice.number).padStart(8, '0')}</p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #6b7280;">Estado: <span style="color: #059669; font-weight: bold;">ACEPTADO</span></p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${invoice.pdfUrl}" style="background: #7c3aed; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">📥 Descargar PDF</a>
          </div>

          <p style="color: #6b7280; font-size: 14px; text-align: center;">Este documento tiene validez legal ante SUNAT. Guárdalo para tus registros.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
Tu ${invoice.type === 'INVOICE' ? 'Factura' : 'Boleta'} Electrónica

Hola ${order.Customer ? `${order.Customer.firstName} ${order.Customer.lastName}` : order.user?.name || 'Cliente'},

Tu ${invoice.type === 'INVOICE' ? 'factura' : 'boleta'} ${invoice.series}-${String(invoice.number).padStart(8, '0')} para el pedido ${order.orderNumber} ha sido aceptada por SUNAT.

Descargar: ${invoice.pdfUrl}

Este documento tiene validez legal ante SUNAT.
    `.trim();

    return { subject: `📄 ${invoice.type === 'INVOICE' ? 'Factura' : 'Boleta'} Electrónica - ${invoice.series}-${String(invoice.number).padStart(8, '0')}`, html, text };
  }

  private getPaymentReceivedTemplate(order: any, amount: Decimal, method: string): NotificationTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">💰 Pago Recibido</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 18px; margin-bottom: 20px;">Hola <strong>${order.Customer ? `${order.Customer.firstName} ${order.Customer.lastName}` : order.user?.name || 'Cliente'}</strong>,</p>
          <p>Hemos recibido tu pago de <strong>${new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(amount))}</strong> para el pedido <strong>${order.orderNumber}</strong>.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 10px 0; color: #6b7280;">Método de pago</p>
            <p style="margin: 0; font-size: 18px; font-weight: bold;">${method}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/orden/${order.orderNumber}" style="background: #059669; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Ver Pedido</a>
          </div>

          <p style="color: #6b7280; font-size: 14px; text-align: center;">Tu pedido está siendo procesado. Te notificaremos cuando sea enviado.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
Pago Recibido

Hola ${order.Customer ? `${order.Customer.firstName} ${order.Customer.lastName}` : order.user?.name || 'Cliente'},

Hemos recibido tu pago de ${new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(amount))} para el pedido ${order.orderNumber}.
Método: ${method}

Ver pedido: ${process.env.NEXT_PUBLIC_APP_URL}/orden/${order.orderNumber}

Pizca del Monte
    `.trim();

    return { subject: `💰 Pago Recibido - ${order.orderNumber}`, html, text };
  }

  private getPaymentFailedTemplate(order: any, reason: string): NotificationTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">❌ Pago No Procesado</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 18px; margin-bottom: 20px;">Hola <strong>${order.Customer ? `${order.Customer.firstName} ${order.Customer.lastName}` : order.user?.name || 'Cliente'}</strong>,</p>
          <p>No pudimos procesar el pago para tu pedido <strong>${order.orderNumber}</strong>.</p>

          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #dc2626;"><strong>Motivo:</strong> ${reason}</p>
          </div>

          <p>Por favor, intenta nuevamente o elige otro método de pago.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/checkout" style="background: #dc2626; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Reintentar Pago</a>
          </div>

          <p style="color: #6b7280; font-size: 14px; text-align: center;">Si necesitas ayuda, contáctanos respondiendo a este correo.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
Pago No Procesado

Hola ${order.Customer ? `${order.Customer.firstName} ${order.Customer.lastName}` : order.user?.name || 'Cliente'},

No pudimos procesar el pago para tu pedido ${order.orderNumber}.
Motivo: ${reason}

Por favor reintenta: ${process.env.NEXT_PUBLIC_APP_URL}/checkout

Pizca del Monte
    `.trim();

    return { subject: `❌ Pago Fallido - ${order.orderNumber}`, html, text };
  }

  private getRefundProcessedTemplate(order: any, amount: Decimal, reason: string): NotificationTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">💸 Reembolso Procesado</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 18px; margin-bottom: 20px;">Hola <strong>${order.Customer ? `${order.Customer.firstName} ${order.Customer.lastName}` : order.user?.name || 'Cliente'}</strong>,</p>
          <p>Se ha procesado un reembolso de <strong>${new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(amount))}</strong> para tu pedido <strong>${order.orderNumber}</strong>.</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Motivo:</strong> ${reason}</p>
            <p><strong>Método:</strong> Se devolverá al método de pago original en 5-10 días hábiles.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/orden/${order.orderNumber}" style="background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Ver Detalles</a>
          </div>

          <p style="color: #6b7280; font-size: 14px; text-align: center;">Pizca del Monte - Tu satisfacción es nuestra prioridad</p>
        </div>
      </body>
      </html>
    `;

    const text = `
Reembolso Procesado

Hola ${order.Customer ? `${order.Customer.firstName} ${order.Customer.lastName}` : order.user?.name || 'Cliente'},

Se ha procesado un reembolso de ${new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(amount))} para tu pedido ${order.orderNumber}.
Motivo: ${reason}

Ver detalles: ${process.env.NEXT_PUBLIC_APP_URL}/orden/${order.orderNumber}

Pizca del Monte
    `.trim();

    return { subject: `💸 Reembolso Procesado - ${order.orderNumber}`, html, text };
  }
}

// Singleton instance
let notificationService: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationService) {
    notificationService = new NotificationService({
      defaultFromEmail: process.env.SMTP_FROM || 'noreply@pizcadelmonte.pe',
      defaultFromName: 'Pizca del Monte',
    });
  }
  return notificationService;
}

export function initializeNotificationService(config: {
  emailProvider?: EmailProvider;
  smsProvider?: SMSProvider;
  whatsappProvider?: WhatsAppProvider;
}) {
  const service = getNotificationService();
  if (config.emailProvider) service.setEmailProvider(config.emailProvider);
  if (config.smsProvider) service.setSMSProvider(config.smsProvider);
  if (config.whatsappProvider) service.setWhatsAppProvider(config.whatsappProvider);
}