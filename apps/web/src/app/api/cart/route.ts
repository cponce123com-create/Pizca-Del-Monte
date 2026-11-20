import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { prisma } from '@pizca/database';
import { z } from 'zod';
import { formatPEN } from '@pizca/utils';

const addItemSchema = z.object({
  variantId: z.string().cuid('ID de variante inválido'),
  quantity: z.number().int().positive().max(99).default(1),
});

const updateItemSchema = z.object({
  itemId: z.string().cuid('ID de item inválido'),
  quantity: z.number().int().min(0).max(99),
});

const removeItemSchema = z.object({
  itemId: z.string().cuid('ID de item inválido'),
});

// Una sola definición de relaciones evita tipos inconsistentes en los carritos nuevos y existentes.
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

async function loadCart(cartId: string) {
  return prisma.cart.findUnique({ where: { id: cartId }, include: cartInclude });
}

async function getOrCreateCart(userId: string | null, sessionCartId: string | null) {
  let cart = userId
    ? await prisma.cart.findUnique({ where: { userId }, include: cartInclude })
    : sessionCartId
      ? await loadCart(sessionCartId)
      : null;

  // Un ID de carrito no permite acceder al carrito de otro usuario registrado.
  if (cart && (userId ? cart.userId !== userId : cart.userId !== null)) {
    cart = null;
  }

  if (!cart) {
    const created = await prisma.cart.create({ data: userId ? { userId } : {} });
    cart = await loadCart(created.id);
  }

  if (!cart) throw new Error('No se pudo cargar el carrito');

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
      cart = await loadCart(targetCartId);
    }
  }

  if (!cart) throw new Error('No se pudo actualizar el carrito');
  return cart;
}

function formatCartResponse(cart: any) {
  const items = cart.items.map((item: any) => {
    const variant = item.variant;
    if (!variant) throw new Error('Producto del carrito no disponible');
    const product = item.product;
    const unitPrice = variant.price?.toNumber() || product.basePrice.toNumber();
    const compareAtPrice = variant.compareAtPrice?.toNumber() || product.compareAtPrice?.toNumber() || null;
    const subtotal = unitPrice * item.quantity;

    return {
      id: item.id,
      variantId: variant.id,
      sku: variant.sku,
      name: variant.name || product.name,
      productSlug: product.slug,
      quantity: item.quantity,
      unitPrice,
      formattedUnitPrice: formatPEN(unitPrice),
      compareAtPrice,
      formattedCompareAtPrice: compareAtPrice ? formatPEN(compareAtPrice) : null,
      subtotal,
      formattedSubtotal: formatPEN(subtotal),
      discountPercent: compareAtPrice && compareAtPrice > unitPrice
        ? Math.round((compareAtPrice - unitPrice) / compareAtPrice * 100)
        : 0,
      weight: variant.weight?.toNumber() || product.weight?.toNumber(),
      inStock: !variant.trackInventory || (variant.inventory?.availableQty || 0) >= item.quantity,
      availableQty: variant.inventory?.availableQty || 0,
      maxQty: variant.trackInventory ? (variant.inventory?.availableQty || 99) : 99,
      image: product.media[0] ? { url: product.media[0].url, alt: product.media[0].alt || product.name } : null,
      brand: product.brand ? { name: product.brand.name, slug: product.brand.slug } : null,
      attributes: variant.attributes.map((a: any) => ({
        name: a.attribute.name,
        value: a.attributeValue.value,
        displayValue: a.attributeValue.value,
        color: a.attributeValue.color,
      })),
    };
  });

  const subtotal = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
  const itemCount = items.reduce((sum: number, item: any) => sum + item.quantity, 0);

  return {
    id: cart.id,
    items,
    subtotal,
    formattedSubtotal: formatPEN(subtotal),
    itemCount,
    itemTypes: items.length,
    expiresAt: cart.expiresAt,
  };
}

// GET /api/cart - Obtener carrito
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || null;
    const sessionCartId = request.headers.get('x-cart-id');

    const cart = await getOrCreateCart(userId, sessionCartId);
    const response = formatCartResponse(cart);

    return NextResponse.json(response, {
      headers: {
        'x-cart-id': cart.id,
      },
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/cart - Agregar item al carrito
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || null;
    const sessionCartId = request.headers.get('x-cart-id');

    const body = await request.json();
    const parsed = addItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { variantId, quantity } = parsed.data;

    // Verificar que la variante existe y está activa
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: true,
        inventory: true,
      },
    });

    if (!variant || variant.product.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Producto no encontrado o no disponible' },
        { status: 404 }
      );
    }

    // Verificar stock
    if (variant.trackInventory && variant.inventory) {
      const available = variant.inventory.availableQty;
      if (available < quantity) {
        return NextResponse.json(
          { error: `Stock insuficiente. Disponible: ${available}` },
          { status: 400 }
        );
      }
    }

    const cart = await getOrCreateCart(userId, sessionCartId);

    // Verificar si ya existe el item
    const existingItem = cart.items.find((item: any) => item.variantId === variantId);

    if (existingItem) {
      const newQuantity = Math.min(existingItem.quantity + quantity, 99);

      // Verificar stock para la nueva cantidad
      if (variant.trackInventory && variant.inventory) {
        if (variant.inventory.availableQty < newQuantity) {
          return NextResponse.json(
            { error: `Stock insuficiente. Disponible: ${variant.inventory.availableQty}` },
            { status: 400 }
          );
        }
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId: variant.productId, variantId, price: variant.price, quantity },
      });
    }

    // Refrescar carrito
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          
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

    const response = formatCartResponse(updatedCart!);
    return NextResponse.json(response, {
      headers: { 'x-cart-id': cart.id },
      status: 201,
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH /api/cart - Actualizar cantidad de item
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || null;
    const sessionCartId = request.headers.get('x-cart-id');

    const body = await request.json();
    const parsed = updateItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { itemId, quantity } = parsed.data;

    const cart = await getOrCreateCart(userId, sessionCartId);
    const item = cart.items.find((i: any) => i.id === itemId);

    if (!item) {
      return NextResponse.json(
        { error: 'Item no encontrado en el carrito' },
        { status: 404 }
      );
    }

    // Verificar stock
    if (item.variant.trackInventory && item.variant.inventory) {
      if (item.variant.inventory.availableQty < quantity) {
        return NextResponse.json(
          { error: `Stock insuficiente. Disponible: ${item.variant.inventory.availableQty}` },
          { status: 400 }
        );
      }
    }

    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity },
      });
    }

    // Refrescar carrito
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          
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

    const response = formatCartResponse(updatedCart!);
    return NextResponse.json(response, {
      headers: { 'x-cart-id': cart.id },
    });
  } catch (error) {
    console.error('Error updating cart:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/cart - Eliminar item o limpiar carrito
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || null;
    const sessionCartId = request.headers.get('x-cart-id');

    const body = await request.json().catch(() => ({}));
    const parsed = removeItemSchema.safeParse(body);

    const cart = await getOrCreateCart(userId, sessionCartId);

    if (parsed.success && parsed.data.itemId) {
      // Eliminar item específico
      const item = cart.items.find((i: any) => i.id === parsed.data.itemId);
      if (!item) {
        return NextResponse.json(
          { error: 'Item no encontrado' },
          { status: 404 }
        );
      }

      await prisma.cartItem.delete({ where: { id: parsed.data.itemId } });
    } else {
      // Limpiar todo el carrito
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    // Refrescar carrito
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          
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

    const response = formatCartResponse(updatedCart!);
    return NextResponse.json(response, {
      headers: { 'x-cart-id': cart.id },
    });
  } catch (error) {
    console.error('Error removing from cart:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}