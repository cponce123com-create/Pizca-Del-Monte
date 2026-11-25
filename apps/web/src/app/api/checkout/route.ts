import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@pizca/database';
import { z } from 'zod';
import { formatPEN } from '@pizca/utils';
import { Prisma } from '@prisma/client';
import { Decimal } from 'decimal.js';

// ============================================
// TIPOS Y ESQUEMAS
// ============================================

const applyCouponSchema = z.object({
  coupon: z.string().trim().toUpperCase().min(3).max(50),
});

const createOrderSchema = z.object({
  shippingAddress: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    phone: z.string().regex(/^\+?51\s?9\d{8}$/, 'Formato: +51 999 888 777'),
    addressLine1: z.string().min(1).max(200),
    addressLine2: z.string().max(200).optional(),
    department: z.string().min(1),
    province: z.string().min(1),
    district: z.string().min(1),
    urbanization: z.string().max(100).optional(),
    reference: z.string().max(200).optional(),
    postalCode: z.string().max(10).optional(),
    instructions: z.string().max(500).optional(),
  }),
  billingAddress: z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    documentType: z.enum(['DNI', 'RUC', 'CE', 'PASAPORTE']),
    documentNumber: z.string().min(1).max(11),
    businessName: z.string().max(200).optional(),
    phone: z.string().optional(),
    email: z.string().email(),
    addressLine1: z.string().min(1).max(200),
    addressLine2: z.string().max(200).optional(),
    department: z.string().min(1),
    province: z.string().min(1),
    district: z.string().min(1),
  }).optional(),
  paymentMethod: z.enum(['MERCADO_PAGO', 'YAPE', 'PLIN', 'BANK_TRANSFER', 'CASH_ON_DELIVERY']),
  shippingMethodId: z.string().cuid(),
  couponCode: z.string().trim().toUpperCase().optional(),
  useSavedAddress: z.boolean().default(false),
  savedShippingAddressId: z.string().cuid().optional(),
  savedBillingAddressId: z.string().cuid().optional(),
});

// Include para carrito con relaciones necesarias
const cartInclude = {
  items: {
    include: {
      product: {
        include: {
          brand: true,
          media: { where: { isPrimary: true }, take: 1 },
          inventory: true,
        },
      },
      variant: {
        include: {
          inventory: true,
          attributes: { include: { attribute: true, attributeValue: true } },
        },
      },
    },
  },
} as const;

type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;
type CartItemWithRelations = CartWithItems['items'][0];

// ============================================
// UTILIDADES
// ============================================

function getCartId(request: NextRequest): string | null {
  return request.headers.get('x-cart-id');
}

async function getOrCreateCart(userId: string | null, sessionCartId: string | null): Promise<CartWithItems> {
  let cart = userId
    ? await prisma.cart.findUnique({ where: { userId }, include: cartInclude })
    : sessionCartId
      ? await prisma.cart.findUnique({ where: { id: sessionCartId }, include: cartInclude })
      : null;

  // Un ID de carrito no permite acceder al carrito de otro usuario registrado.
  if (cart && (userId ? cart.userId !== userId : cart.userId !== null)) {
    cart = null;
  }

  if (!cart) {
    const created = await prisma.cart.create({ data: userId ? { userId } : {} });
    cart = await prisma.cart.findUnique({ where: { id: created.id }, include: cartInclude });
  }

  if (!cart) throw new Error('No se pudo cargar el carrito');

  // Merge guest cart → user cart al loguearse
  if (userId && sessionCartId && sessionCartId !== cart.id) {
    const guestCart = await prisma.cart.findUnique({
      where: { id: sessionCartId },
      include: { items: true },
    });
    if (guestCart && !guestCart.userId) {
      const targetCartId = cart.id;
      await prisma.$transaction(async (tx) => {
        for (const item of guestCart.items) {
          const existing = cart!.items.find((i) =>
            i.productId === item.productId && i.variantId === item.variantId
          );
          if (existing) {
            await tx.cartItem.update({
              where: { id: existing.id },
              data: { quantity: Math.min(99, existing.quantity + item.quantity) },
            });
          } else {
            await tx.cartItem.create({
              data: {
                cartId: targetCartId,
                productId: item.productId,
                variantId: item.variantId,
                price: item.price,
                quantity: item.quantity,
              },
            });
          }
        }
        await tx.cart.delete({ where: { id: guestCart.id } });
      });
      cart = await prisma.cart.findUnique({ where: { id: targetCartId }, include: cartInclude });
    }
  }

  if (!cart) throw new Error('No se pudo actualizar el carrito');
  return cart;
}

function calculateItemTotals(item: CartItemWithRelations) {
  const variant = item.variant;
  if (!variant) throw new Error('Producto del carrito no disponible');
  const product = item.product;

  const unitPrice = new Decimal(variant.price?.toString() ?? product.basePrice.toString());
  const compareAtPrice = variant.compareAtPrice
    ? new Decimal(variant.compareAtPrice.toString())
    : product.compareAtPrice
      ? new Decimal(product.compareAtPrice.toString())
      : null;
  const subtotal = unitPrice.mul(item.quantity);

  return {
    unitPrice,
    compareAtPrice,
    subtotal,
    discountPercent: compareAtPrice && compareAtPrice.gt(unitPrice)
      ? compareAtPrice.minus(unitPrice).div(compareAtPrice).mul(100).toNumber()
      : 0,
  };
}

async function getShippingMethods(cart: CartWithItems, shippingAddress: { department: string; province: string; district: string }): Promise<ShippingMethod[]> {
  // Calcular peso total del carrito
  const totalWeight = cart.items.reduce((sum, item) => {
    const variant = item.variant;
    const product = item.product;
    const weight = variant?.weight?.toNumber() ?? product.weight?.toNumber() ?? 0;
    return sum + weight * item.quantity;
  }, 0);

  // Obtener transportistas activos con zonas y tarifas
  const carriers = await prisma.carrier.findMany({
    where: { isActive: true },
    include: {
      shippingZones: {
        where: { isActive: true },
        include: {
          rates: { where: { isActive: true } },
        },
      },
      shippingRules: { where: { isActive: true } },
    },
    orderBy: { priority: 'asc' },
  });

  const methods: ShippingMethod[] = [];

  for (const carrier of carriers) {
    for (const zone of carrier.shippingZones) {
      // Verificar si la zona aplica a la dirección
      const matchesCountry = zone.countries.includes('PE');
      const matchesRegion = zone.regions.length === 0 || zone.regions.includes(shippingAddress.department);
      const matchesProvince = zone.provinces.length === 0 || zone.provinces.includes(shippingAddress.province);
      const matchesDistrict = zone.districts.length === 0 || zone.districts.includes(shippingAddress.district);
      const matchesPostal = zone.postalCodes.length === 0; // TODO: validar código postal

      if (!matchesCountry || !matchesRegion || !matchesProvince || !matchesDistrict) continue;

      for (const rate of zone.rates) {
        // Verificar peso
        if (totalWeight < rate.minWeight.toNumber()) continue;
        if (rate.maxWeight && totalWeight > rate.maxWeight.toNumber()) continue;

        // Verificar reglas de envío específico por producto/variante/categoría
        let applicable = true;
        let multiplier = new Decimal(1);
        let fixedPrice: Decimal | null = null;
        let freeShipping = false;

        for (const rule of carrier.shippingRules) {
          const productMatches = cart.items.some(item => {
            if (rule.productId && item.productId !== rule.productId) return false;
            if (rule.variantId && item.variantId !== rule.variantId) return false;
            if (rule.categoryId) {
              return item.product.categories.some(pc => pc.categoryId === rule.categoryId);
            }
            return true;
          });

          if (productMatches) {
            applicable = true;
            if (rule.freeShipping) freeShipping = true;
            if (rule.fixedPrice) fixedPrice = rule.fixedPrice;
            if (rule.multiplier && rule.multiplier.gt(0)) multiplier = rule.multiplier;
            if (rule.minQty) {
              const totalQty = cart.items
                .filter(i => !rule.productId || i.productId === rule.productId)
                .reduce((sum, i) => sum + i.quantity, 0);
              if (totalQty < rule.minQty) applicable = false;
            }
            if (rule.maxQty) {
              const totalQty = cart.items
                .filter(i => !rule.productId || i.productId === rule.productId)
                .reduce((sum, i) => sum + i.quantity, 0);
              if (totalQty > rule.maxQty) applicable = false;
            }
          }
        }

        if (!applicable) continue;

        const baseCost = freeShipping
          ? new Decimal(0)
          : fixedPrice ?? rate.basePrice.add(rate.pricePerKg.mul(totalWeight)).mul(multiplier);

        methods.push({
          id: `${carrier.id}-${zone.id}-${rate.id}`,
          carrierId: carrier.id,
          carrierName: carrier.name,
          carrierSlug: carrier.slug,
          zoneName: zone.name,
          name: rate.name,
          basePrice: baseCost.toNumber(),
          pricePerKg: rate.pricePerKg.toNumber(),
          estimatedDays: `${rate.estimatedDays} día${rate.estimatedDays > 1 ? 's' : ''}`,
          freeShippingThreshold: rate.minOrderAmount?.toNumber() ?? null,
        });
      }
    }
  }

  // Ordenar por precio ascendente
  return methods.sort((a, b) => a.basePrice - b.basePrice);
}

async function getSavedAddresses(userId: string): Promise<SavedAddress[]> {
  const addresses = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  return addresses.map(a => ({
    id: a.id,
    type: a.type,
    isDefault: a.isDefault,
    firstName: a.firstName,
    lastName: a.lastName,
    company: a.company,
    addressLine1: a.addressLine1,
    addressLine2: a.addressLine2,
    neighborhood: a.neighborhood,
    district: a.district,
    province: a.province,
    department: a.department,
    postalCode: a.postalCode,
    country: a.country,
    phone: a.phone,
    instructions: a.instructions,
    latitude: a.latitude?.toNumber() ?? null,
    longitude: a.longitude?.toNumber() ?? null,
    ubigeo: a.ubigeo,
  }));
}

async function validateAndCalculateCoupon(
  code: string,
  cart: CartWithItems,
  userId: string | null
): Promise<{ discount: Decimal; coupon: typeof prisma.coupon.$inferSelect } | null> {
  const coupon = await prisma.coupon.findUnique({
    where: { code },
    include: {
      products: { include: { product: true, variant: true, category: true } },
      customers: true,
    },
  });

  if (!coupon || !coupon.isActive) return null;
  const now = new Date();
  if (coupon.startDate > now || (coupon.endDate && coupon.endDate < now)) return null;
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return null;
  if (coupon.perCustomerLimit && userId) {
    const userUsage = await prisma.order.count({
      where: { userId, coupons: { some: { couponId: coupon.id } } },
    });
    if (userUsage >= coupon.perCustomerLimit) return null;
  }
  if (!coupon.appliesToAll && coupon.products.length === 0) return null;

  // Verificar monto mínimo
  const subtotal = cart.items.reduce((sum, item) => sum.add(calculateItemTotals(item).subtotal), new Decimal(0));
  if (coupon.minOrderAmount && subtotal.lt(coupon.minOrderAmount)) return null;

  // Verificar productos aplicables
  if (!coupon.appliesToAll) {
    const hasApplicableProduct = cart.items.some(item => {
      return coupon.products.some(cp => {
        if (cp.productId && item.productId === cp.productId) return true;
        if (cp.variantId && item.variantId === cp.variantId) return true;
        if (cp.categoryId) {
          return item.product.categories.some(pc => pc.categoryId === cp.categoryId);
        }
        return false;
      });
    });
    if (!hasApplicableProduct) return null;
  }

  // Calcular descuento
  let discount = new Decimal(0);
  switch (coupon.type) {
    case 'PERCENTAGE':
      discount = subtotal.mul(coupon.value).div(100);
      if (coupon.maxDiscount) discount = Decimal.min(discount, coupon.maxDiscount);
      break;
    case 'FIXED_AMOUNT':
      discount = Decimal.min(coupon.value, subtotal);
      break;
    case 'FREE_SHIPPING':
      // Se maneja en shippingMethods (freeShippingThreshold)
      discount = new Decimal(0);
      break;
    case 'BUY_X_GET_Y':
    case 'GIFT_PRODUCT':
      // Complejo: requiere lógica adicional, por ahora 0
      discount = new Decimal(0);
      break;
  }

  return { discount, coupon };
}

function formatCartResponse(cart: CartWithItems) {
  const items = cart.items.map(item => {
    const { unitPrice, compareAtPrice, subtotal, discountPercent } = calculateItemTotals(item);
    const variant = item.variant!;
    const product = item.product;

    return {
      id: item.id,
      variantId: variant.id,
      sku: variant.sku,
      name: variant.name || product.name,
      productSlug: product.slug,
      quantity: item.quantity,
      unitPrice: unitPrice.toNumber(),
      formattedUnitPrice: formatPEN(unitPrice.toNumber()),
      subtotal: subtotal.toNumber(),
      formattedSubtotal: formatPEN(subtotal.toNumber()),
      discountPercent,
      weight: variant.weight?.toNumber() ?? product.weight?.toNumber(),
      inStock: !variant.trackInventory || (variant.inventory?.availableQty ?? 0) >= item.quantity,
      availableQty: variant.inventory?.availableQty ?? 0,
      maxQty: variant.trackInventory ? (variant.inventory?.availableQty ?? 0) : 99,
      image: product.media[0] ? { url: product.media[0].url, alt: product.media[0].alt || product.name } : null,
    };
  });

  const subtotal = items.reduce((sum, item) => sum.add(new Decimal(item.subtotal)), new Decimal(0));
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    id: cart.id,
    items,
    subtotal: subtotal.toNumber(),
    formattedSubtotal: formatPEN(subtotal.toNumber()),
    itemCount,
    itemTypes: items.length,
    expiresAt: cart.expiresAt,
  };
}

// ============================================
// TIPOS DE RESPUESTA
// ============================================

interface SavedAddress {
  id: string;
  type: string;
  isDefault: boolean;
  firstName: string;
  lastName: string;
  company: string | null;
  addressLine1: string;
  addressLine2: string | null;
  neighborhood: string | null;
  district: string;
  province: string;
  department: string;
  postalCode: string | null;
  country: string;
  phone: string | null;
  instructions: string | null;
  latitude: number | null;
  longitude: number | null;
  ubigeo: string | null;
}

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface ShippingMethod {
  id: string;
  carrierId: string;
  carrierName: string;
  carrierSlug: string;
  zoneName: string;
  name: string;
  basePrice: number;
  pricePerKg: number;
  estimatedDays: string;
  freeShippingThreshold: number | null;
}

interface CheckoutSummary {
  cart: {
    items: ReturnType<typeof formatCartResponse>['items'];
    subtotal: number;
    formattedSubtotal: string;
    itemCount: number;
  };
  shipping: {
    cost: number;
    freeShipping: boolean;
    estimatedDays: string;
    carrier?: string;
  };
  tax: number;
  formattedTax: string;
  coupon: { code: string; discount: number; formattedDiscount: string } | null;
  total: number;
  formattedTotal: string;
  savedAddresses: SavedAddress[];
  paymentMethods: PaymentMethod[];
  shippingMethods: ShippingMethod[];
}

// ============================================
// HANDLERS
// ============================================

// GET /api/checkout - Obtener resumen de checkout
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;
    const sessionCartId = getCartId(request);

    const cart = await getOrCreateCart(userId, sessionCartId);

    if (cart.items.length === 0) {
      return NextResponse.json(
        { error: 'El carrito está vacío' },
        { status: 400 }
      );
    }

    // Validar stock de todos los items
    for (const item of cart.items) {
      const variant = item.variant;
      if (!variant) {
        return NextResponse.json(
          { error: `Producto no disponible: ${item.product.name}` },
          { status: 400 }
        );
      }
      if (variant.trackInventory) {
        const available = variant.inventory?.availableQty ?? 0;
        if (available < item.quantity) {
          return NextResponse.json(
            { error: `Stock insuficiente para ${variant.name}. Disponible: ${available}` },
            { status: 400 }
          );
        }
      }
    }

    // Obtener direcciones guardadas
    const savedAddresses = userId ? await getSavedAddresses(userId) : [];

    // Usar dirección de envío por defecto para calcular métodos de envío
    const defaultShipping = savedAddresses.find(a => a.type === 'shipping' && a.isDefault);
    const shippingAddressForCalc = defaultShipping ?? {
      department: 'Lima',
      province: 'Lima',
      district: 'Miraflores',
    };

    const shippingMethods = await getShippingMethods(cart, shippingAddressForCalc);

    // Formatear carrito
    const formattedCart = formatCartResponse(cart);
    const subtotal = new Decimal(formattedCart.subtotal);

    // Seleccionar método de envío más barato por defecto
    const defaultShippingMethod = shippingMethods[0];
    const shippingCost = defaultShippingMethod ? new Decimal(defaultShippingMethod.basePrice) : new Decimal(0);
    const freeShipping = defaultShippingMethod?.basePrice === 0 ?? false;

    // Calcular IGV (18% por defecto, configurable)
    const taxRate = new Decimal('0.18');
    const taxableAmount = subtotal; // IGV sobre subtotal (antes de envío en Perú)
    const tax = taxableAmount.mul(taxRate).toDecimalPlaces(2);

    // Total
    const total = subtotal.add(shippingCost).add(tax);

    // Métodos de pago disponibles
    const paymentMethods: PaymentMethod[] = [
      { id: 'MERCADO_PAGO', name: 'Mercado Pago', description: 'Tarjeta de crédito/débito, Yape, Plin, efectivo', icon: 'credit-card' },
      { id: 'YAPE', name: 'Yape', description: 'Pago móvil con Yape', icon: 'smartphone' },
      { id: 'PLIN', name: 'Plin', description: 'Pago móvil con Plin', icon: 'smartphone' },
      { id: 'BANK_TRANSFER', name: 'Transferencia bancaria', description: 'Pago por transferencia (validación manual)', icon: 'banknote' },
      { id: 'CASH_ON_DELIVERY', name: 'Pago contra entrega', description: 'Paga al recibir (solo Lima, +S/ 5.00)', icon: 'truck' },
    ];

    const summary: CheckoutSummary = {
      cart: {
        items: formattedCart.items,
        subtotal: formattedCart.subtotal,
        formattedSubtotal: formattedCart.formattedSubtotal,
        itemCount: formattedCart.itemCount,
      },
      shipping: {
        cost: shippingCost.toNumber(),
        freeShipping,
        estimatedDays: defaultShippingMethod?.estimatedDays ?? '3-5 días',
        carrier: defaultShippingMethod?.carrierName,
      },
      tax: tax.toNumber(),
      formattedTax: formatPEN(tax.toNumber()),
      coupon: null,
      total: total.toNumber(),
      formattedTotal: formatPEN(total.toNumber()),
      savedAddresses,
      paymentMethods,
      shippingMethods,
    };

    return NextResponse.json(summary, {
      headers: { 'x-cart-id': cart.id, 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error fetching checkout summary:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/checkout?coupon=CODE - Aplicar cupón y recalcular
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id ?? null;
    const sessionCartId = getCartId(request);

    const cart = await getOrCreateCart(userId, sessionCartId);

    if (cart.items.length === 0) {
      return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 });
    }

    // Verificar si es aplicación de cupón (GET con query) o creación de orden (POST con body)
    const url = new URL(request.url);
    const couponQuery = url.searchParams.get('coupon');

    if (couponQuery && request.method === 'GET') {
      // Aplicar cupón - recalcular totales
      const couponResult = await validateAndCalculateCoupon(couponQuery, cart, userId);
      if (!couponResult) {
        return NextResponse.json({ error: 'Cupón inválido, expirado o no aplica a este carrito' }, { status: 400 });
      }

      // Recalcular con descuento
      const formattedCart = formatCartResponse(cart);
      const subtotal = new Decimal(formattedCart.subtotal);
      const discount = couponResult.discount;
      const taxableAmount = subtotal.minus(discount);
      const tax = taxableAmount.mul(new Decimal('0.18')).toDecimalPlaces(2);

      // Obtener método de envío actual (del header o query)
      const shippingMethodId = url.searchParams.get('shippingMethodId');
      const savedAddresses = userId ? await getSavedAddresses(userId) : [];
      const defaultShipping = savedAddresses.find(a => a.type === 'shipping' && a.isDefault);
      const shippingAddressForCalc = defaultShipping ?? { department: 'Lima', province: 'Lima', district: 'Miraflores' };
      const shippingMethods = await getShippingMethods(cart, shippingAddressForCalc);
      const selectedShipping = shippingMethods.find(m => m.id === shippingMethodId) ?? shippingMethods[0];
      const shippingCost = selectedShipping ? new Decimal(selectedShipping.basePrice) : new Decimal(0);

      const total = taxableAmount.add(shippingCost).add(tax);

      return NextResponse.json({
        ...formattedCart,
        subtotal: subtotal.toNumber(),
        formattedSubtotal: formatPEN(subtotal.toNumber()),
        shipping: {
          cost: shippingCost.toNumber(),
          freeShipping: shippingCost.eq(0),
          estimatedDays: selectedShipping?.estimatedDays ?? '3-5 días',
          carrier: selectedShipping?.carrierName,
        },
        tax: tax.toNumber(),
        formattedTax: formatPEN(tax.toNumber()),
        coupon: {
          code: couponResult.coupon.code,
          discount: discount.toNumber(),
          formattedDiscount: formatPEN(discount.toNumber()),
        },
        total: total.toNumber(),
        formattedTotal: formatPEN(total.toNumber()),
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // CREAR ORDEN
    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      shippingAddress,
      billingAddress,
      paymentMethod,
      shippingMethodId,
      couponCode,
      useSavedAddress,
      savedShippingAddressId,
      savedBillingAddressId,
    } = parsed.data;

    // Validar stock nuevamente (race condition)
    for (const item of cart.items) {
      const variant = item.variant!;
      if (variant.trackInventory) {
        const available = variant.inventory?.availableQty ?? 0;
        if (available < item.quantity) {
          return NextResponse.json(
            { error: `Stock cambió: ${variant.name} solo tiene ${available} unidades` },
            { status: 409 }
          );
        }
      }
    }

    // Obtener método de envío seleccionado
    const savedAddresses = userId ? await getSavedAddresses(userId) : [];
    const defaultShipping = savedAddresses.find(a => a.type === 'shipping' && a.isDefault);
    const shippingAddressForCalc = defaultShipping ?? { department: 'Lima', province: 'Lima', district: 'Miraflores' };
    const shippingMethods = await getShippingMethods(cart, shippingAddressForCalc);
    const selectedShippingMethod = shippingMethods.find(m => m.id === shippingMethodId);

    if (!selectedShippingMethod) {
      return NextResponse.json({ error: 'Método de envío no válido' }, { status: 400 });
    }

    // Calcular totales finales
    const formattedCart = formatCartResponse(cart);
    const subtotal = new Decimal(formattedCart.subtotal);
    const shippingCost = new Decimal(selectedShippingMethod.basePrice);

    // Cupón
    let discount = new Decimal(0);
    let appliedCoupon = null;
    if (couponCode) {
      const couponResult = await validateAndCalculateCoupon(couponCode, cart, userId);
      if (couponResult) {
        discount = couponResult.discount;
        appliedCoupon = couponResult.coupon;
      }
    }

    const taxableAmount = subtotal.minus(discount);
    const tax = taxableAmount.mul(new Decimal('0.18')).toDecimalPlaces(2);
    const total = taxableAmount.add(shippingCost).add(tax);

    // Generar número de orden único
    const orderNumber = `PDM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Idempotency key para pagos
    const idempotencyKey = `order-${orderNumber}-${Date.now()}`;

    // Crear orden en transacción
    const order = await prisma.$transaction(async (tx) => {
      // 1. Crear dirección de envío (o usar guardada)
      let shippingAddressId: string;
      if (useSavedAddress && savedShippingAddressId) {
        shippingAddressId = savedShippingAddressId;
      } else {
        const addr = await tx.address.create({
          data: {
            userId,
            type: 'shipping',
            firstName: shippingAddress.firstName,
            lastName: shippingAddress.lastName,
            addressLine1: shippingAddress.addressLine1,
            addressLine2: shippingAddress.addressLine2,
            neighborhood: shippingAddress.urbanization,
            district: shippingAddress.district,
            province: shippingAddress.province,
            department: shippingAddress.department,
            postalCode: shippingAddress.postalCode,
            country: 'PE',
            phone: shippingAddress.phone,
            instructions: shippingAddress.reference,
          },
        });
        shippingAddressId = addr.id;
      }

      // 2. Crear dirección de facturación (o usar guardada / misma que envío)
      let billingAddressId: string | null = null;
      if (billingAddress) {
        if (useSavedAddress && savedBillingAddressId) {
          billingAddressId = savedBillingAddressId;
        } else {
          const addr = await tx.address.create({
            data: {
              userId,
              type: 'billing',
              firstName: billingAddress.firstName,
              lastName: billingAddress.lastName,
              addressLine1: billingAddress.addressLine1,
              addressLine2: billingAddress.addressLine2,
              district: billingAddress.district,
              province: billingAddress.province,
              department: billingAddress.department,
              country: 'PE',
              phone: billingAddress.phone,
            },
          });
          billingAddressId = addr.id;
        }
      }

      // 3. Crear orden
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: userId ?? undefined,
          status: 'PENDING_PAYMENT',
          currency: 'PEN',
          subtotal: subtotal.toFixed(2),
          discountAmount: discount.toFixed(2),
          shippingAmount: shippingCost.toFixed(2),
          taxAmount: tax.toFixed(2),
          total: total.toFixed(2),
          paidAmount: '0',
          balanceDue: total.toFixed(2),
          shippingAddressId,
          billingAddressId,
          shippingAddress: {
            firstName: shippingAddress.firstName,
            lastName: shippingAddress.lastName,
            phone: shippingAddress.phone,
            addressLine1: shippingAddress.addressLine1,
            addressLine2: shippingAddress.addressLine2,
            department: shippingAddress.department,
            province: shippingAddress.province,
            district: shippingAddress.district,
            urbanization: shippingAddress.urbanization,
            reference: shippingAddress.reference,
            postalCode: shippingAddress.postalCode,
            instructions: shippingAddress.instructions,
          },
          billingAddress: billingAddress ? {
            firstName: billingAddress.firstName,
            lastName: billingAddress.lastName,
            documentType: billingAddress.documentType,
            documentNumber: billingAddress.documentNumber,
            businessName: billingAddress.businessName,
            phone: billingAddress.phone,
            email: billingAddress.email,
            addressLine1: billingAddress.addressLine1,
            addressLine2: billingAddress.addressLine2,
            department: billingAddress.department,
            province: billingAddress.province,
            district: billingAddress.district,
          } : undefined,
          shippingMethod: selectedShippingMethod.name,
          shippingCarrier: selectedShippingMethod.carrierName,
          paymentMethod,
          paymentIdempotencyKey: idempotencyKey,
          documentType: billingAddress?.documentType === 'RUC' ? 'INVOICE' : 'RECEIPT',
        },
      });

      // 4. Crear items de orden
      for (const item of cart.items) {
        const variant = item.variant!;
        const product = item.product;
        const { unitPrice, subtotal: itemSubtotal } = calculateItemTotals(item);

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            variantId: item.variantId,
            sku: variant.sku,
            name: variant.name || product.name,
            variantName: variant.name !== product.name ? variant.name : null,
            quantity: item.quantity,
            unitPrice: unitPrice.toFixed(2),
            taxRate: '18.00',
            taxAmount: unitPrice.mul(item.quantity).mul(new Decimal('0.18')).toFixed(2),
            total: itemSubtotal.toFixed(2),
          },
        });
      }

      // 5. Aplicar cupón si existe
      if (appliedCoupon) {
        await tx.orderCoupon.create({
          data: {
            orderId: order.id,
            couponId: appliedCoupon.id,
            discount: discount.toFixed(2),
          },
        });
        await tx.coupon.update({
          where: { id: appliedCoupon.id },
          data: { usageCount: { increment: 1 } },
        });
      }

      // 6. Crear historial de estado
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          toStatus: 'PENDING_PAYMENT',
          reason: 'Orden creada, pendiente de pago',
        },
      });

      // 7. Crear pago pendiente
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          paymentMethod,
          provider: paymentMethod === 'MERCADO_PAGO' ? 'mercadopago' : paymentMethod.toLowerCase(),
          status: 'PENDING',
          amount: total.toFixed(2),
          currency: 'PEN',
          idempotencyKey,
        },
      });

      // 8. Crear envío pendiente
      await tx.shipment.create({
        data: {
          shipmentNumber: `SHIP-${orderNumber}`,
          orderId: order.id,
          carrierId: selectedShippingMethod.carrierId,
          status: 'PENDING',
          weight: new Decimal(cart.items.reduce((sum, item) => {
            const variant = item.variant!;
            const product = item.product;
            const weight = variant.weight?.toNumber() ?? product.weight?.toNumber() ?? 0;
            return sum + weight * item.quantity;
          }, 0).toFixed(3)),
          declaredValue: total,
          shippingCost: shippingCost.toFixed(2),
        },
      });

      // 9. Limpiar carrito
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return { order, payment };
    });

    // Procesar pago según método
    let paymentUrl: string | null = null;

    if (paymentMethod === 'MERCADO_PAGO') {
      paymentUrl = await createMercadoPagoPreference(order.order, order.payment, cart.items, shippingAddress);
    } else if (paymentMethod === 'BANK_TRANSFER') {
      // TODO: Generar datos de cuenta bancaria desde settings
      paymentUrl = `/orden/${order.order.orderNumber}?pendiente=true&metodo=transferencia`;
    } else if (paymentMethod === 'CASH_ON_DELIVERY') {
      // Contraentrega: confirmar orden directamente
      await prisma.order.update({
        where: { id: order.order.id },
        data: { status: 'PAYMENT_CONFIRMED' },
      });
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: { status: 'PENDING', failureReason: 'Pago contra entrega - pendiente cobro' },
      });
      paymentUrl = `/orden/${order.order.orderNumber}?confirmado=true`;
    } else {
      // Yape, Plin - por ahora redirigir a página de instrucciones
      paymentUrl = `/orden/${order.order.orderNumber}?pendiente=true&metodo=${paymentMethod.toLowerCase()}`;
    }

    return NextResponse.json({
      order: { orderNumber: order.order.orderNumber },
      payment: { paymentUrl },
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (error) {
    console.error('Error creating order:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ============================================
// MERCADO PAGO INTEGRATION
// ============================================

async function createMercadoPagoPreference(
  order: { id: string; orderNumber: string; total: Prisma.Decimal },
  payment: { id: string; idempotencyKey: string | null },
  cartItems: CartItemWithRelations[],
  shippingAddress: { firstName: string; lastName: string; email?: string; phone: string; addressLine1: string; addressLine2?: string; district: string; province: string; department: string }
): Promise<string> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (!accessToken) {
    console.warn('MERCADOPAGO_ACCESS_TOKEN no configurado, usando modo demo');
    return `${baseUrl}/orden/${order.orderNumber}?pendiente=true&demo=mercadopago`;
  }

  try {
    const { MercadoPagoConfig, Preference } = await import('mercadopago');
    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const items = cartItems.map(item => {
      const variant = item.variant!;
      const product = item.product;
      const { unitPrice } = calculateItemTotals(item);

      return {
        id: variant.sku,
        title: `${variant.name || product.name} (${variant.sku})`,
        quantity: item.quantity,
        unit_price: unitPrice.toNumber(),
        currency_id: 'PEN',
        description: product.shortDescription ?? product.description ?? undefined,
        picture_url: product.media[0]?.url,
      };
    });

    // Agregar envío como item separado si tiene costo
    // (Mercado Pago maneja shipping aparte en la preferencia)

    const result = await preference.create({
      body: {
        items,
        payer: {
          name: shippingAddress.firstName,
          surname: shippingAddress.lastName,
          email: shippingAddress.email ?? undefined,
          phone: { area_code: '', number: shippingAddress.phone.replace(/\D/g, '') },
          address: {
            street_name: shippingAddress.addressLine1,
            street_number: 'S/N',
            zip_code: shippingAddress.district, // Usar distrito como referencia
          },
        },
        back_urls: {
          success: `${baseUrl}/orden/${order.orderNumber}?pago=exitoso`,
          failure: `${baseUrl}/orden/${order.orderNumber}?pago=fallido`,
          pending: `${baseUrl}/orden/${order.orderNumber}?pago=pendiente`,
        },
        notification_url: `${baseUrl}/api/webhooks/mercadopago`,
        external_reference: order.orderNumber,
        statement_descriptor: 'PIZCA DEL MONTE',
        expires: false,
        auto_return: 'approved',
      },
    });

    // Actualizar payment con providerPaymentId
    if (result.id) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { providerPaymentId: result.id },
      });
    }

    return result.init_point ?? `${baseUrl}/orden/${order.orderNumber}?pendiente=true`;
  } catch (error) {
    console.error('Error creating Mercado Pago preference:', error);
    // Fallback: no bloquear la orden, dejar que el usuario pague manualmente
    return `${baseUrl}/orden/${order.orderNumber}?pendiente=true&error=mp_init`;
  }
}