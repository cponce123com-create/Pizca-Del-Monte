import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@pizca/database';
import { z } from 'zod';
import { formatPEN, generateOrderNumber } from '@pizca/utils';

const checkoutSchema = z.object({
  // Información de envío
  shippingAddress: z.object({
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    phone: z.string().regex(/^\+?51\s?9\d{8}$/),
    addressLine1: z.string().min(5),
    addressLine2: z.string().optional(),
    department: z.string().min(2),
    province: z.string().min(2),
    district: z.string().min(2),
    urbanization: z.string().optional(),
    reference: z.string().optional(),
    postalCode: z.string().optional(),
    instructions: z.string().optional(),
  }),
  // Información de facturación (opcional, si es diferente)
  billingAddress: z.object({
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    documentType: z.enum(['DNI', 'RUC', 'CE', 'PASAPORTE']),
    documentNumber: z.string().min(8).max(11),
    businessName: z.string().optional(),
    phone: z.string().regex(/^\+?51\s?9\d{8}$/),
    email: z.string().email(),
    addressLine1: z.string().min(5),
    addressLine2: z.string().optional(),
    department: z.string().min(2),
    province: z.string().min(2),
    district: z.string().min(2),
  }).optional(),
  // Método de pago
  paymentMethod: z.enum(['MERCADO_PAGO', 'BANK_TRANSFER', 'CASH_ON_DELIVERY']),
  // Envío
  shippingMethodId: z.string().cuid().optional(),
  // Notas
  notes: z.string().max(500).optional(),
  // Cupones
  couponCode: z.string().optional(),
  // Usar dirección guardada
  useSavedAddress: z.boolean().default(false),
  savedShippingAddressId: z.string().cuid().optional(),
  savedBillingAddressId: z.string().cuid().optional(),
});

async function calculateShipping(cart: any, shippingMethodId?: string, department?: string) {
  // Si se proporciona un shippingMethodId, buscar la tarifa en la BD
  if (shippingMethodId) {
    const rate = await prisma.shippingRate.findUnique({
      where: { id: shippingMethodId },
      include: { zone: { include: { carrier: true } } },
    });

    if (rate && rate.isActive) {
      let cost = rate.basePrice.toNumber();

      // Calcular por peso si aplica
      const totalWeight = cart.items.reduce((sum: number, item: any) => {
        const weight = item.variant.weight?.toNumber() || item.variant.product.weight?.toNumber() || 0;
        return sum + weight * item.quantity;
      }, 0);

      if (rate.pricePerKg.toNumber() > 0 && totalWeight > 0) {
        cost += rate.pricePerKg.toNumber() * totalWeight;
      }

      // Envío gratis si supera el mínimo
      if (rate.minOrderAmount && cart.subtotal >= rate.minOrderAmount.toNumber()) {
        cost = 0;
      }

      return {
        cost: Math.round(cost * 100) / 100,
        freeShipping: cost === 0,
        estimatedDays: `${rate.estimatedDays}`,
        carrier: rate.zone.carrier.name,
      };
    }
  }

  // Fallback: envío estándar
  const baseShipping = 15.00;
  const freeShippingThreshold = 200.00;

  if (cart.subtotal >= freeShippingThreshold) {
    return { cost: 0, freeShipping: true, estimatedDays: '2-3' };
  }

  if (department && department !== 'LIMA') {
    return { cost: baseShipping + 10, freeShipping: false, estimatedDays: '3-5' };
  }

  return { cost: baseShipping, freeShipping: false, estimatedDays: '2-3' };
}

async function applyCoupon(cart: any, couponCode: string) {
  const coupon = await prisma.coupon.findUnique({
    where: { code: couponCode.toUpperCase(), deletedAt: null },
  });

  if (!coupon) {
    return { valid: false, error: 'Cupón no encontrado' };
  }

  if (coupon.status !== 'ACTIVE') {
    return { valid: false, error: 'Cupón no válido' };
  }

  if (coupon.startsAt && new Date() < coupon.startsAt) {
    return { valid: false, error: 'Cupón aún no válido' };
  }

  if (coupon.expiresAt && new Date() > coupon.expiresAt) {
    return { valid: false, error: 'Cupón expirado' };
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, error: 'Cupón agotado' };
  }

  if (coupon.minOrderAmount && cart.subtotal < coupon.minOrderAmount.toNumber()) {
    return { valid: false, error: `Mínimo de compra: ${formatPEN(coupon.minOrderAmount)}` };
  }

  // Verificar productos/categorías aplicables
  if (coupon.applicableProducts.length > 0 || coupon.applicableCategories.length > 0) {
    const hasApplicable = cart.items.some((item: any) => {
      if (coupon.applicableProducts.includes(item.variantId)) return true;
      // Verificar categorías - requeriría query adicional
      return false;
    });
    if (!hasApplicable) {
      return { valid: false, error: 'Cupón no aplica a productos en el carrito' };
    }
  }

  let discount = 0;
  if (coupon.type === 'PERCENTAGE') {
    discount = cart.subtotal * (coupon.value.toNumber() / 100);
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount.toNumber()) {
      discount = coupon.maxDiscountAmount.toNumber();
    }
  } else if (coupon.type === 'FIXED_AMOUNT') {
    discount = Math.min(coupon.value.toNumber(), cart.subtotal);
  } else if (coupon.type === 'FREE_SHIPPING') {
    // El envío gratis se maneja en calculateShipping
    discount = 0;
  }

  return {
    valid: true,
    discount,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value.toNumber(),
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión para proceder al pago' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const sessionCartId = request.headers.get('x-cart-id');

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Obtener carrito
    const cart = await prisma.cart.findFirst({
      where: {
        OR: [{ userId }, { id: sessionCartId }],
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        items: {
          where: { deletedAt: null },
          include: {
            variant: {
              include: {
                product: { include: { brand: true, media: { where: { isPrimary: true }, take: 1 }, inventory: true } },
                inventory: true,
                attributes: { include: { attribute: true, attributeValue: true } },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { error: 'El carrito está vacío' },
        { status: 400 }
      );
    }

    // Verificar stock de todos los items
    for (const item of cart.items) {
      const variant = item.variant;
      if (variant.trackInventory && variant.inventory) {
        if (variant.inventory.availableQty < item.quantity) {
          return NextResponse.json(
            { error: `Stock insuficiente para ${variant.name || variant.product.name}. Disponible: ${variant.inventory.availableQty}` },
            { status: 400 }
          );
        }
      }
    }

    // Calcular subtotal
    const subtotal = cart.items.reduce((sum: number, item: any) => {
      const unitPrice = item.variant.price?.toNumber() || item.variant.product.basePrice.toNumber();
      return sum + unitPrice * item.quantity;
    }, 0);

    // Aplicar cupón si hay
    let couponDiscount = 0;
    let appliedCoupon: any = null;
    if (data.couponCode) {
      const couponResult = await applyCoupon({ subtotal, items: cart.items }, data.couponCode);
      if (!couponResult.valid) {
        return NextResponse.json(
          { error: couponResult.error },
          { status: 400 }
        );
      }
      couponDiscount = couponResult.discount;
      appliedCoupon = couponResult.coupon;
    }

    // Calcular envío
    const shipping = await calculateShipping(
      { subtotal, items: cart.items },
      data.shippingMethodId,
      data.shippingAddress.department
    );

    // Calcular impuestos (IGV 18% en Perú)
    const taxableAmount = subtotal - couponDiscount + shipping.cost;
    const taxRate = 0.18;
    const tax = Math.round(taxableAmount * taxRate * 100) / 100;

    const total = Math.round((taxableAmount + tax) * 100) / 100;

    // Generar número de orden
    const orderNumber = generateOrderNumber();

    // Obtener o crear cliente
    let customer = await prisma.customer.findUnique({ where: { userId } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          userId,
          firstName: session.user.name?.split(' ')[0] || 'Cliente',
          lastName: session.user.name?.split(' ').slice(1).join(' ') || '',
          email: session.user.email || '',
          phone: session.user.phone || null,
        },
      });
    }

    // Crear dirección de envío
    const shippingAddress = await prisma.address.create({
      data: {
        customerId: customer.id,
        type: 'SHIPPING',
        isDefault: true,
        firstName: data.shippingAddress.firstName,
        lastName: data.shippingAddress.lastName,
        phone: data.shippingAddress.phone,
        addressLine1: data.shippingAddress.addressLine1,
        addressLine2: data.shippingAddress.addressLine2,
        department: data.shippingAddress.department,
        province: data.shippingAddress.province,
        district: data.shippingAddress.district,
        urbanization: data.shippingAddress.urbanization,
        reference: data.shippingAddress.reference,
        postalCode: data.shippingAddress.postalCode,
        instructions: data.shippingAddress.instructions,
      },
    });

    // Crear dirección de facturación si es diferente
    let billingAddress = shippingAddress;
    if (data.billingAddress) {
      billingAddress = await prisma.address.create({
        data: {
          customerId: customer.id,
          type: 'BILLING',
          isDefault: true,
          firstName: data.billingAddress.firstName,
          lastName: data.billingAddress.lastName,
          phone: data.billingAddress.phone,
          email: data.billingAddress.email,
          addressLine1: data.billingAddress.addressLine1,
          addressLine2: data.billingAddress.addressLine2,
          department: data.billingAddress.department,
          province: data.billingAddress.province,
          district: data.billingAddress.district,
        },
      });
    }

    // Crear orden en transacción
    const order = await prisma.$transaction(async (tx) => {
      // Crear orden
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          userId,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          fulfillmentStatus: 'PENDING',
          currency: 'PEN',
          subtotal,
          discountAmount: couponDiscount,
          shippingAmount: shipping.cost,
          taxAmount: tax,
          totalAmount: total,
          shippingAddressId: shippingAddress.id,
          billingAddressId: billingAddress.id,
          shippingMethod: data.shippingMethodId ? 'STANDARD' : 'STANDARD',
          estimatedDelivery: new Date(Date.now() + (shipping.estimatedDays === '2-3' ? 3 : 5) * 24 * 60 * 60 * 1000),
          notes: data.notes,
          couponId: appliedCoupon?.id,
          items: {
            create: cart.items.map((item: any) => {
              const variant = item.variant;
              const product = variant.product;
              const unitPrice = variant.price?.toNumber() || product.basePrice.toNumber();
              const compareAtPrice = variant.compareAtPrice?.toNumber() || product.compareAtPrice?.toNumber() || null;
              const totalPrice = unitPrice * item.quantity;

              return {
                variantId: variant.id,
                productId: product.id,
                sku: variant.sku,
                productName: product.name,
                variantName: variant.name,
                quantity: item.quantity,
                unitPrice,
                compareAtPrice,
                totalPrice,
                weight: variant.weight?.toNumber() || product.weight?.toNumber(),
                attributes: variant.attributes.map((a: any) => ({
                  attribute: a.attribute.name,
                  value: a.attributeValue.value,
                  displayValue: a.attributeValue.displayValue,
                })),
              };
            }),
          },
        },
        include: { items: true },
      });

      // Si hay cupón, incrementar uso
      if (appliedCoupon) {
        await tx.coupon.update({
          where: { id: appliedCoupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      // Reservar inventario
      for (const item of cart.items) {
        const variant = item.variant;
        if (variant.trackInventory && variant.inventory) {
          await tx.inventory.update({
            where: { id: variant.inventory.id },
            data: { reservedQty: { increment: item.quantity } },
          });
        }
      }

      // Marcar carrito como convertido
      await tx.cart.update({
        where: { id: cart.id },
        data: { status: 'CONVERTED', convertedAt: new Date() },
      });

      return newOrder;
    });

    // Procesar pago según método
    let paymentResult: any = null;
    let paymentUrl: string | null = null;

    if (data.paymentMethod === 'MERCADO_PAGO') {
      // TODO: Integrar con Mercado Pago SDK
      // const mpPreference = await createMercadoPagoPreference(order, data.shippingAddress);
      // paymentUrl = mpPreference.init_point;
      // paymentResult = { preferenceId: mpPreference.id };

      // Placeholder para desarrollo
      paymentResult = {
        message: 'Integración Mercado Pago pendiente',
        sandbox: true,
      };
    } else if (data.paymentMethod === 'BANK_TRANSFER') {
      // Generar instrucciones de transferencia
      const bankAccounts = await prisma.paymentMethod.findMany({
        where: { type: 'BANK_TRANSFER', isActive: true },
      });
      paymentResult = { bankAccounts };
    } else if (data.paymentMethod === 'CASH_ON_DELIVERY') {
      // Verificar si el distrito permite pago contra entrega
      paymentResult = { allowed: true };
    }

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount.toNumber(),
        formattedTotal: formatPEN(order.totalAmount),
        estimatedDelivery: order.estimatedDelivery,
      },
      payment: {
        method: data.paymentMethod,
        paymentUrl,
        ...paymentResult,
      },
      shipping: {
        cost: shipping.cost,
        freeShipping: shipping.freeShipping,
        estimatedDays: shipping.estimatedDays,
      },
      coupon: appliedCoupon ? { code: appliedCoupon.code, discount: couponDiscount } : null,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET /api/checkout - Obtener resumen de checkout (para mostrar antes de confirmar)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Debes iniciar sesión' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const sessionCartId = request.headers.get('x-cart-id');
    const { searchParams } = new URL(request.url);
    const couponCode = searchParams.get('coupon');
    const department = searchParams.get('department');

    const cart = await prisma.cart.findFirst({
      where: {
        OR: [{ userId }, { id: sessionCartId }],
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        items: {
          where: { deletedAt: null },
          include: {
            variant: {
              include: {
                product: { include: { brand: true, media: { where: { isPrimary: true }, take: 1 }, inventory: true } },
                inventory: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { error: 'El carrito está vacío' },
        { status: 400 }
      );
    }

    const subtotal = cart.items.reduce((sum: number, item: any) => {
      const unitPrice = item.variant.price?.toNumber() || item.variant.product.basePrice.toNumber();
      return sum + unitPrice * item.quantity;
    }, 0);

    let couponDiscount = 0;
    let appliedCoupon: any = null;
    if (couponCode) {
      const couponResult = await applyCoupon({ subtotal, items: cart.items }, couponCode);
      if (couponResult.valid) {
        couponDiscount = couponResult.discount;
        appliedCoupon = couponResult.coupon;
      }
    }

    const shipping = await calculateShipping({ subtotal, items: cart.items }, undefined, department || undefined);
    const taxableAmount = subtotal - couponDiscount + shipping.cost;
    const tax = Math.round(taxableAmount * 0.18 * 100) / 100;
    const total = Math.round((taxableAmount + tax) * 100) / 100;

    // Obtener direcciones guardadas del cliente
    const customer = await prisma.customer.findUnique({ where: { userId } });
    let savedAddresses: any[] = [];
    if (customer) {
      savedAddresses = await prisma.address.findMany({
        where: { customerId: customer.id, deletedAt: null },
        orderBy: { isDefault: 'desc' },
      });
    }

    // Métodos de pago disponibles (desde enum + configuración)
    const paymentMethods = [
      { id: 'MERCADO_PAGO', name: 'Mercado Pago', description: 'Tarjetas, Yape, Plin, transferencia', icon: 'credit-card' },
      { id: 'BANK_TRANSFER', name: 'Transferencia Bancaria', description: 'BCP, Interbank, BBVA, Scotiabank', icon: 'bank' },
      { id: 'CASH_ON_DELIVERY', name: 'Pago contra entrega', description: 'Efectivo al recibir (solo Lima)', icon: 'truck' },
    ];

    // Métodos de envío - usar carriers y shipping zones
    const carriers = await prisma.carrier.findMany({
      where: { isActive: true },
      include: {
        zones: {
          where: { isActive: true },
          include: { rates: { where: { isActive: true } } },
        },
      },
      orderBy: { priority: 'asc' },
    });

    const shippingMethods = carriers.flatMap((carrier) =>
      carrier.zones.flatMap((zone) =>
        zone.rates.map((rate) => ({
          id: rate.id,
          carrierId: carrier.id,
          carrierName: carrier.name,
          carrierSlug: carrier.slug,
          zoneName: zone.name,
          name: rate.name,
          basePrice: rate.basePrice.toNumber(),
          pricePerKg: rate.pricePerKg.toNumber(),
          estimatedDays: rate.estimatedDays,
          freeShippingThreshold: rate.minOrderAmount?.toNumber(),
        }))
      )
    );

    return NextResponse.json({
      cart: {
        items: cart.items.map((item: any) => ({
          id: item.id,
          variantId: item.variant.id,
          sku: item.variant.sku,
          name: item.variant.name || item.variant.product.name,
          productSlug: item.variant.product.slug,
          quantity: item.quantity,
          unitPrice: item.variant.price?.toNumber() || item.variant.product.basePrice.toNumber(),
          formattedUnitPrice: formatPEN(item.variant.price || item.variant.product.basePrice),
          subtotal: (item.variant.price?.toNumber() || item.variant.product.basePrice.toNumber()) * item.quantity,
          formattedSubtotal: formatPEN((item.variant.price?.toNumber() || item.variant.product.basePrice.toNumber()) * item.quantity),
          image: item.variant.product.media[0] ? { url: item.variant.product.media[0].url, alt: item.variant.product.media[0].alt } : null,
          inStock: !item.variant.trackInventory || (item.variant.inventory?.availableQty || 0) >= item.quantity,
          maxQty: item.variant.trackInventory ? (item.variant.inventory?.availableQty || 99) : 99,
        })),
        subtotal,
        formattedSubtotal: formatPEN(subtotal),
        itemCount: cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
      },
      shipping,
      tax,
      formattedTax: formatPEN(tax),
      coupon: appliedCoupon ? { code: appliedCoupon.code, discount: couponDiscount, formattedDiscount: formatPEN(couponDiscount) } : null,
      total,
      formattedTotal: formatPEN(total),
      savedAddresses,
      paymentMethods,
      shippingMethods,
    });
  } catch (error) {
    console.error('Error fetching checkout summary:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}