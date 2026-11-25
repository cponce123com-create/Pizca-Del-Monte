import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { NubeFactClient, buildNubeFactItem, buildAddressString, SunatDocumentType, SunatComprobanteType, SunatAfectacionIGV } from '@pizca/utils';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, forceRegenerate } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId es requerido' }, { status: 400 });
    }

    // Obtener la orden con todos los datos necesarios
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        shippingAddressRel: true,
        billingAddressRel: true,
        payments: {
          where: { status: 'APPROVED' },
        },
        user: true,
        Customer: true,
        documents: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    // Verificar permisos: solo el dueño de la orden o admin puede generar documentos
    const isAdmin = (session.user as any).roles?.some((r: any) => ['SUPERADMIN', 'ADMIN', 'ACCOUNTING'].includes(r.name));
    if (order.userId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Verificar que la orden esté pagada
    const paidAmount = order.paidAmount.toNumber();
    const totalAmount = order.total.toNumber();
    if (paidAmount < totalAmount && !isAdmin) {
      return NextResponse.json({ error: 'La orden debe estar completamente pagada para generar documento' }, { status: 400 });
    }

    // Verificar si ya existe un documento para esta orden
    const existingDoc = order.documents.find(d => d.type === 'INVOICE' || d.type === 'RECEIPT');
    if (existingDoc && !forceRegenerate) {
      return NextResponse.json({
        success: true,
        document: existingDoc,
        message: 'El documento ya existe. Use forceRegenerate=true para regenerar.',
      });
    }

    // Obtener configuración de la tienda
    const storeSettings = await prisma.storeSetting.findMany({
      where: { group: { in: ['general', 'tax', 'billing'] } },
    });

    const settingsMap = Object.fromEntries(storeSettings.map(s => [s.key, s.value]));

    const companyRuc = settingsMap.company_ruc || process.env.SUNAT_RUC || '20123456789';
    const companyName = settingsMap.store_name || 'Pizca del Monte SAC';
    const companyAddress = settingsMap.company_address || 'Av. Principal 123, Lima, Perú';
    const companyUbigeo = settingsMap.company_ubigeo || '150101';
    const igvRate = parseFloat(settingsMap.igv_rate || '18');

    // Determinar tipo de documento según el receptor
    const customer = order.Customer || order.user;
    const billingAddress = order.billingAddressRel;
    const shippingAddress = order.shippingAddressRel;

    const receptorDocType = billingAddress ?
      (billingAddress.documentType === 'RUC' ? SunatDocumentType.RUC : SunatDocumentType.DNI) :
      (customer?.documentType === 'RUC' ? SunatDocumentType.RUC : SunatDocumentType.DNI);

    const receptorDocNumber = billingAddress?.documentNumber || customer?.documentNumber || '00000000';
    const receptorName = billingAddress
      ? `${billingAddress.firstName} ${billingAddress.lastName}`.trim()
      : customer?.name || 'Cliente Sin Identificar';

    const isRuc = receptorDocType === SunatDocumentType.RUC && receptorDocNumber.length === 11;
    const comprobanteType = isRuc ? SunatComprobanteType.FACTURA : SunatComprobanteType.BOLETA;

    // Obtener serie y número siguiente
    const docType = comprobanteType === SunatComprobanteType.FACTURA ? 'INVOICE' : 'RECEIPT';
    const seriesPrefix = comprobanteType === SunatComprobanteType.FACTURA ? 'F001' : 'B001';

    const lastDoc = await prisma.document.findFirst({
      where: { type: docType as any, series: seriesPrefix },
      orderBy: { number: 'desc' },
    });

    const nextNumber = (lastDoc?.number || 0) + 1;

    // Construir dirección del receptor
    const receptorAddress = billingAddress
      ? buildAddressString({
          addressLine1: billingAddress.addressLine1,
          addressLine2: billingAddress.addressLine2,
          neighborhood: billingAddress.neighborhood,
          district: billingAddress.district,
          province: billingAddress.province,
          department: billingAddress.department,
          postalCode: billingAddress.postalCode,
        })
      : shippingAddress
        ? buildAddressString({
            addressLine1: shippingAddress.addressLine1,
            addressLine2: shippingAddress.addressLine2,
            neighborhood: shippingAddress.neighborhood,
            district: shippingAddress.district,
            province: shippingAddress.province,
            department: shippingAddress.department,
            postalCode: shippingAddress.postalCode,
          })
        : companyAddress;

    // Construir items
    const items = order.items.map(item => buildNubeFactItem({
      sku: item.sku,
      name: item.name + (item.variantName ? ` - ${item.variantName}` : ''),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      discountAmount: item.discountAmount,
    }, {
      defaultUnitOfMeasure: 'NIU',
      defaultProductSunatCode: '10000000', // Código genérico
      igvRate,
    }));

    // Calcular totales
    const subtotal = order.subtotal.toNumber();
    const discount = order.discountAmount.toNumber();
    const shipping = order.shippingAmount.toNumber();
    const tax = order.taxAmount.toNumber();
    const total = order.total.toNumber();

    // Preparar payload para NubeFact
    const nubefactPayload = {
      operacion: 'generar_comprobante' as const,
      tipo_de_comprobante: comprobanteType,
      serie: seriesPrefix,
      numero: nextNumber,
      sunat_transaction: 1, // Venta
      tipo_documento_emisor: SunatDocumentType.RUC,
      numero_documento_emisor: companyRuc,
      tipo_documento_receptor: receptorDocType,
      numero_documento_receptor: receptorDocNumber,
      nombre_receptor: receptorName,
      direccion_receptor: receptorAddress,
      ubigeo_receptor: billingAddress?.ubigeo || shippingAddress?.ubigeo || companyUbigeo,
      departamento_receptor: billingAddress?.department || shippingAddress?.department,
      provincia_receptor: billingAddress?.province || shippingAddress?.province,
      distrito_receptor: billingAddress?.district || shippingAddress?.district,
      email_receptor: billingAddress?.phone || customer?.email,
      fecha_emision: new Date().toISOString().split('T')[0],
      tipo_moneda: 'PEN',
      porc_igv: igvRate,
      items,
      total_gravadas: subtotal - discount,
      total_inafectas: 0,
      total_exoneradas: 0,
      total_gratuitas: 0,
      total_descuentos: discount,
      total_igv: tax,
      total_isc: 0,
      total_otros_tributos: 0,
      total,
      forma_pago: {
        forma_pago: order.paidAmount.gte(order.total) ? 'Contado' : 'Credito',
      },
    };

    // Configurar cliente NubeFact
    const nubefact = new NubeFactClient({
      apiKey: process.env.PSE_API_KEY || '',
      baseUrl: process.env.PSE_BASE_URL || 'https://api.nubefact.com/api/v1',
      testMode: process.env.NODE_ENV !== 'production',
    });

    // Enviar a NubeFact
    if (!process.env.PSE_API_KEY) {
      return NextResponse.json({
        error: 'NubeFact no configurado. Configure PSE_API_KEY en variables de entorno.',
        document: null,
      }, { status: 503 });
    }

    const result = await nubefact.sendRequest(nubefactPayload);

    if (!result.success) {
      // Guardar intento fallido para auditoría
      await prisma.document.create({
        data: {
          orderId: order.id,
          type: docType as any,
          series: seriesPrefix,
          number: nextNumber,
          sunatStatus: 'ERROR',
          sunatResponse: result,
          metadata: { error: result.mensaje, errors: result.errors },
        },
      });

      return NextResponse.json({
        success: false,
        error: 'Error generando documento en NubeFact',
        details: result.mensaje,
        errors: result.errors,
      }, { status: 500 });
    }

    // Guardar documento exitoso
    const document = await prisma.document.create({
      data: {
        orderId: order.id,
        type: docType as any,
        series: seriesPrefix,
        number: nextNumber,
        sunatId: result.hash_cpe,
        sunatStatus: 'ACEPTADO',
        sunatResponse: result.sunat_response,
        xmlContent: result.xml,
        cdrContent: result.cdr,
        pdfUrl: result.pdf_url,
        signedAt: new Date(),
        metadata: {
          nubefactResponse: result,
          comprobanteType,
          receptorDocType,
          receptorDocNumber,
          receptorName,
        },
      },
    });

    // Actualizar orden con información del documento
    await prisma.order.update({
      where: { id: order.id },
      data: {
        documentType: docType as any,
        documentSeries: seriesPrefix,
        documentNumber: nextNumber.toString(),
        documentSunatStatus: 'ACEPTADO',
        documentSunatResponse: result.sunat_response,
      },
    });

    // Log de auditoría
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entityType: 'Document',
        entityId: document.id,
        newData: {
          type: docType,
          series: seriesPrefix,
          number: nextNumber,
          sunatStatus: 'ACEPTADO',
        },
      },
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        type: docType,
        series: seriesPrefix,
        number: nextNumber,
        sunatStatus: 'ACEPTADO',
        pdfUrl: result.pdf_url,
        xmlContent: result.xml,
        cdrContent: result.cdr,
      },
    });
  } catch (error) {
    console.error('Error generating document:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}