import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
                variants: { where: { isActive: true } },
              },
            },
            variant: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Solo permitir reordenar pedidos entregados, reembolsados o parcialmente reembolsados
    if (!['DELIVERED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(order.status)) {
      return NextResponse.json({ error: 'Este pedido no puede volverse a ordenar' }, { status: 400 });
    }

    // Verificar stock y disponibilidad de cada item
    const availableItems = [];
    const unavailableItems = [];

    for (const item of order.items) {
      let available = false;
      let availableQty = 0;

      if (item.variantId && item.variant) {
        available = item.variant.isActive && item.variant.inventory?.availableQty >= item.quantity;
        availableQty = item.variant.inventory?.availableQty || 0;
      } else if (item.product) {
        available = item.product.isActive && item.product.inventory?.availableQty >= item.quantity;
        availableQty = item.product.inventory?.availableQty || 0;
      }

      if (available) {
        availableItems.push({ ...item, availableQty });
      } else {
        unavailableItems.push({ ...item, availableQty });
      }
    }

    if (availableItems.length === 0) {
      return NextResponse.json(
        { error: 'Ningún producto del pedido está disponible actualmente' },
        { status: 400 }
      );
    }

    // Obtener o crear carrito del usuario
    let cart = await prisma.cart.findUnique({
      where: { userId: session.user.id },
      include: { items: true },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: session.user.id },
        include: { items: true },
      });
    }

    // Agregar items disponibles al carrito
    for (const item of availableItems) {
      const existingItem = cart.items.find(
        i => i.productId === item.productId && i.variantId === item.variantId
      );

      if (existingItem) {
        const newQuantity = existingItem.quantity + item.quantity;

        // Verificar que no exceda stock disponible
        const maxQty = item.availableQty;
        if (newQuantity > maxQty) {
          await prisma.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: maxQty },
          });
        } else {
          await prisma.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: newQuantity },
          });
        }
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      addedItems: availableItems.length,
      unavailableItems: unavailableItems.length,
      message: unavailableItems.length > 0
        ? `${availableItems.length} productos agregados al carrito. ${unavailableItems.length} productos no tienen stock suficiente.`
        : `${availableItems.length} productos agregados al carrito.`,
    });
  } catch (error) {
    console.error('Error reordering:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}