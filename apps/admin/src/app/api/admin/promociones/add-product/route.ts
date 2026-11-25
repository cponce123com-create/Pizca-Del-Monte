import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { z } from 'zod';

const schema = z.object({
  promotionId: z.string().cuid(),
  productId: z.string().cuid().optional().nullable(),
  variantId: z.string().cuid().optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
  collectionId: z.string().cuid().optional().nullable(),
}).refine(
  (data) => data.productId || data.variantId || data.categoryId || data.collectionId,
  { message: 'Debe proporcionar al menos un ID' }
);

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const formData = await request.formData();
    const body = Object.fromEntries(formData);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { promotionId, productId, variantId, categoryId, collectionId } = parsed.data;

    // Verify promotion exists
    const promotion = await prisma.promotion.findUnique({ where: { id: promotionId } });
    if (!promotion) {
      return NextResponse.json({ error: 'Promoción no encontrada' }, { status: 404 });
    }

    // Verify the target exists
    if (productId) {
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }
    if (variantId) {
      const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
      if (!variant) return NextResponse.json({ error: 'Variante no encontrada' }, { status: 404 });
    }
    if (categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
    }
    if (collectionId) {
      const collection = await prisma.collection.findUnique({ where: { id: collectionId } });
      if (!collection) return NextResponse.json({ error: 'Colección no encontrada' }, { status: 404 });
    }

    const link = await prisma.$transaction(async (tx) => {
      const result = await tx.promotionProduct.create({
        data: { promotionId, productId, variantId, categoryId, collectionId },
      });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: 'CREATE',
          entityType: 'PromotionProduct',
          entityId: promotionId,
          newData: { promotionId, productId, variantId, categoryId, collectionId },
        },
      });

      return result;
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error('Error adding promotion product:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Esta relación ya existe' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}