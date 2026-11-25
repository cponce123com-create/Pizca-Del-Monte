import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import crypto from 'crypto';

// NubeFact Webhook Handler for SUNAT Document Status Updates
// https://nubefact.com/manual/api/#webhooks

interface NubeFactWebhookPayload {
  evento: 'comprobante_aceptado' | 'comprobante_rechazado' | 'comprobante_anulado' | 'resumen_aceptado' | 'resumen_rechazado' | 'guia_aceptada' | 'guia_rechazada';
  comprobante: {
    tipo_de_comprobante: number;
    serie: string;
    numero: number;
    hash_cpe: string;
    fecha_emision: string;
    sunat_response: {
      codigo: string;
      descripcion: string;
      nota?: string;
    };
    cdr: string;
    xml: string;
    pdf_url: string;
  };
  timestamp: string;
  firma: string; // HMAC-SHA256 para verificación
}

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.NUBEFACT_WEBHOOK_SECRET;

    // Verificar firma HMAC si está configurado
    if (webhookSecret) {
      const signature = request.headers.get('x-nubefact-signature') || request.headers.get('x-signature');
      if (!signature) {
        console.warn('NubeFact webhook: Missing signature header');
        return NextResponse.json({ error: 'Firma requerida' }, { status: 401 });
      }

      const body = await request.text();
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      // Comparar de forma segura
      const providedBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      if (providedBuffer.length !== expectedBuffer.length ||
          !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
        console.warn('NubeFact webhook: Invalid signature');
        return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
      }

      const payload = JSON.parse(body) as NubeFactWebhookPayload;
      await processNubeFactWebhook(payload);
    } else {
      // Sin secret configurado, procesar pero advertir
      console.warn('NubeFact webhook: No webhook secret configured, processing without verification');
      const payload = await request.json() as NubeFactWebhookPayload;
      await processNubeFactWebhook(payload);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing NubeFact webhook:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

async function processNubeFactWebhook(payload: NubeFactWebhookPayload) {
  const { evento, comprobante, timestamp } = payload;

  // Buscar documento en nuestra BD
  const docTypeMap: Record<number, string> = {
    1: 'INVOICE',
    2: 'RECEIPT',
    3: 'CREDIT_NOTE',
    4: 'DEBIT_NOTE',
    8: 'DELIVERY_NOTE',
  };

  const docType = docTypeMap[comprobante.tipo_de_comprobante];
  if (!docType) {
    console.warn(`NubeFact webhook: Unknown document type ${comprobante.tipo_de_comprobante}`);
    return;
  }

  const document = await prisma.document.findFirst({
    where: {
      type: docType as any,
      series: comprobante.serie,
      number: comprobante.numero,
    },
    include: { order: true },
  });

  if (!document) {
    console.warn(`NubeFact webhook: Document not found ${docType} ${comprobante.serie}-${comprobante.numero}`);
    return;
  }

  // Mapear estado SUNAT
  const sunatStatusMap: Record<string, string> = {
    comprobante_aceptado: 'ACEPTADO',
    comprobante_rechazado: 'RECHAZADO',
    comprobante_anulado: 'ANULADO',
    resumen_aceptado: 'ACEPTADO',
    resumen_rechazado: 'RECHAZADO',
    guia_aceptada: 'ACEPTADO',
    guia_rechazada: 'RECHAZADO',
  };

  const newSunatStatus = sunatStatusMap[evento] || 'DESCONOCIDO';

  // Actualizar documento
  await prisma.$transaction(async (tx) => {
    await tx.document.update({
      where: { id: document.id },
      data: {
        sunatStatus: newSunatStatus,
        sunatResponse: comprobante.sunat_response,
        cdrContent: comprobante.cdr,
        xmlContent: comprobante.xml,
        pdfUrl: comprobante.pdf_url,
        sunatId: comprobante.hash_cpe,
        signedAt: newSunatStatus === 'ACEPTADO' ? new Date() : document.signedAt,
        voidedAt: newSunatStatus === 'ANULADO' ? new Date() : document.voidedAt,
        voidReason: newSunatStatus === 'ANULADO' ? comprobante.sunat_response.descripcion : document.voidReason,
        metadata: {
          ...(document.metadata as any),
          lastWebhookEvent: evento,
          lastWebhookAt: timestamp,
          sunatResponse: comprobante.sunat_response,
        },
      },
    });

    // Actualizar orden si es factura/boleta
    if (document.orderId && (docType === 'INVOICE' || docType === 'RECEIPT')) {
      await tx.order.update({
        where: { id: document.orderId },
        data: {
          documentSunatStatus: newSunatStatus,
          documentSunatResponse: comprobante.sunat_response,
        },
      });

      // Si fue aceptado, crear asiento contable automático
      if (newSunatStatus === 'ACEPTADO') {
        await createAccountingEntryForDocument(tx, document, comprobante);
      }
    }

    // Log de auditoría
    await tx.auditLog.create({
      data: {
        action: 'WEBHOOK',
        entityType: 'Document',
        entityId: document.id,
        newData: {
          evento,
          sunatStatus: newSunatStatus,
          sunatResponse: comprobante.sunat_response,
        },
        metadata: { webhookPayload: payload },
      },
    });
  });
}

async function createAccountingEntryForDocument(
  tx: any,
  document: any,
  comprobante: NubeFactWebhookPayload['comprobante']
) {
  try {
    // Obtener cuentas contables configuradas
    const accounts = await tx.account.findMany({
      where: {
        code: { in: ['12', '40', '10', '41'] }, // Clientes, Ventas, Caja/Banco, IGV
        isActive: true,
      },
    });

    const accountMap = Object.fromEntries(accounts.map((a: any) => [a.code, a.id]));

    const total = document.metadata?.total || 0;
    const igv = document.metadata?.total_igv || 0;
    const subtotal = total - igv;

    // Crear asiento contable
    const entryNumber = `AS-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    await tx.accountingEntry.create({
      data: {
        entryNumber,
        date: new Date(comprobante.fecha_emision),
        type: 'SALE',
        description: `Venta ${document.series}-${document.number} - ${comprobante.sunat_response.descripcion}`,
        referenceType: 'document',
        referenceId: document.id,
        totalDebit: new Decimal(total),
        totalCredit: new Decimal(total),
        status: 'POSTED',
        postedAt: new Date(),
        metadata: { sunatResponse: comprobante.sunat_response },
        lines: {
          create: [
            // Débito: Cuentas por cobrar / Caja
            {
              accountId: accountMap['12'] || accountMap['10'],
              description: `Cliente - ${document.order?.user?.name || 'Cliente'}`,
              debit: new Decimal(total),
              credit: new Decimal(0),
              sortOrder: 1,
            },
            // Crédito: Ventas
            {
              accountId: accountMap['40'],
              description: 'Ventas gravadas',
              debit: new Decimal(0),
              credit: new Decimal(subtotal),
              sortOrder: 2,
            },
            // Crédito: IGV
            {
              accountId: accountMap['41'],
              description: 'IGV 18%',
              debit: new Decimal(0),
              credit: new Decimal(igv),
              sortOrder: 3,
            },
          ],
        },
      },
    });
  } catch (error) {
    console.error('Error creating accounting entry:', error);
    // No lanzar error para no bloquear el webhook
  }
}

// Import Decimal for accounting entry
import { Decimal } from 'decimal.js';