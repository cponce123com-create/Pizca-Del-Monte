'use server';

import { prisma } from '@pizca/database';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';

const promotionFields = z.object({
  name: z.string().trim().min(1).max(180),
  slug: z.string().trim().max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(5000).optional(),
  type: z.enum(['PERCENTAGE_OFF', 'FIXED_AMOUNT_OFF', 'BUY_X_GET_Y', 'FREE_SHIPPING', 'GIFT_WITH_PURCHASE', 'VOLUME_DISCOUNT', 'TIME_LIMITED']),
  value: z.string().trim().regex(/^\d{1,10}(?:\.\d{1,2})?$/),
  minOrderAmount: z.string().trim().regex(/^\d{1,10}(?:\.\d{1,2})?$/).optional().nullable(),
  maxDiscount: z.string().trim().regex(/^\d{1,10}(?:\.\d{1,2})?$/).optional().nullable(),
  usageLimit: z.string().trim().regex(/^\d{1,9}$/).optional().nullable(),
  perCustomerLimit: z.string().trim().regex(/^\d{1,9}$/).optional().nullable(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  isActive: z.enum(['on', 'off']).transform(v => v === 'on').default('on'),
  priority: z.string().trim().regex(/^\d{1,3}$/).transform(Number).default('0'),
  appliesToAll: z.enum(['on', 'off']).transform(v => v === 'on').default('off'),
  requiresCoupon: z.enum(['on', 'off']).transform(v => v === 'on').default('off'),
  couponCode: z.string().trim().max(40).optional().nullable(),
});

const promotionProductFields = z.object({
  promotionId: z.string().cuid(),
  productId: z.string().cuid().optional().nullable(),
  variantId: z.string().cuid().optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
  collectionId: z.string().cuid().optional().nullable(),
});

export async function savePromotion(id: string | null, form: FormData) {
  const admin = await requireAdmin();
  const parsed = promotionFields.safeParse(Object.fromEntries(form));
  const target = id ? '/admin/promociones/' + encodeURIComponent(id) : '/admin/promociones';
  if (!parsed.success) redirect(target + '?error=invalid');

  try {
    await prisma.$transaction(async (tx) => {
      const data = {
        ...parsed.data,
        value: parsed.data.value,
        minOrderAmount: parsed.data.minOrderAmount ?? null,
        maxDiscount: parsed.data.maxDiscount ?? null,
        usageLimit: parsed.data.usageLimit ? Number(parsed.data.usageLimit) : null,
        perCustomerLimit: parsed.data.perCustomerLimit ? Number(parsed.data.perCustomerLimit) : null,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        startDate: new Date(parsed.data.startDate),
        couponCode: parsed.data.couponCode || null,
      };

      const promotion = id
        ? await tx.promotion.update({ where: { id }, data })
        : await tx.promotion.create({ data });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: id ? 'UPDATE' : 'CREATE',
          entityType: 'Promotion',
          entityId: promotion.id,
          newData: data,
        },
      });
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      redirect(target + '?error=duplicate');
    }
    throw error;
  }

  revalidatePath('/admin/promociones');
  redirect('/admin/promociones?saved=1');
}

export async function deletePromotion(id: string) {
  const admin = await requireAdmin();
  await prisma.$transaction(async (tx) => {
    await tx.promotionProduct.deleteMany({ where: { promotionId: id } });
    await tx.promotion.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        userId: admin.id,
        action: 'DELETE',
        entityType: 'Promotion',
        entityId: id,
      },
    });
  });
  revalidatePath('/admin/promociones');
  redirect('/admin/promociones?deleted=1');
}

export async function addPromotionProduct(form: FormData) {
  const admin = await requireAdmin();
  const parsed = promotionProductFields.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Datos inválidos' };

  // Validar que al menos uno esté presente
  if (!parsed.data.productId && !parsed.data.variantId && !parsed.data.categoryId && !parsed.data.collectionId) {
    return { error: 'Debe seleccionar al menos un producto, variante, categoría o colección' };
  }

  try {
    await prisma.promotionProduct.create({ data: parsed.data });
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'CREATE',
        entityType: 'PromotionProduct',
        entityId: parsed.data.promotionId,
        newData: parsed.data,
      },
    });
    revalidatePath('/admin/promociones/' + parsed.data.promotionId);
    return { success: true };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return { error: 'Esta relación ya existe' };
    }
    throw error;
  }
}

export async function removePromotionProduct(id: string, promotionId: string) {
  const admin = await requireAdmin();
  await prisma.promotionProduct.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'DELETE',
      entityType: 'PromotionProduct',
      entityId: promotionId,
      oldData: { id },
    },
  });
  revalidatePath('/admin/promociones/' + promotionId);
  return { success: true };
}

export async function togglePromotionStatus(id: string, isActive: boolean) {
  const admin = await requireAdmin();
  await prisma.promotion.update({ where: { id }, data: { isActive } });
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'UPDATE',
      entityType: 'Promotion',
      entityId: id,
      newData: { isActive },
    },
  });
  revalidatePath('/admin/promociones');
  return { success: true };
}