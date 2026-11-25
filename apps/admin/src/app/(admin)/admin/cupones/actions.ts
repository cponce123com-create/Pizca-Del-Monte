'use server';

import { prisma } from '@pizca/database';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';

const couponFields = z.object({
  code: z.string().trim().min(1).max(40).toUpperCase(),
  name: z.string().trim().min(1).max(180),
  description: z.string().trim().max(5000).optional(),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING', 'BUY_X_GET_Y', 'GIFT_PRODUCT']),
  value: z.string().trim().regex(/^\d{1,10}(?:\.\d{1,2})?$/),
  minOrderAmount: z.string().trim().regex(/^\d{1,10}(?:\.\d{1,2})?$/).optional().nullable(),
  maxDiscount: z.string().trim().regex(/^\d{1,10}(?:\.\d{1,2})?$/).optional().nullable(),
  usageLimit: z.string().trim().regex(/^\d{1,9}$/).optional().nullable(),
  perCustomerLimit: z.string().trim().regex(/^\d{1,9}$/).transform(Number).default('1'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  isActive: z.enum(['on', 'off']).transform(v => v === 'on').default('on'),
  appliesToAll: z.enum(['on', 'off']).transform(v => v === 'on').default('off'),
  promotionId: z.string().cuid().optional().nullable(),
});

const couponProductFields = z.object({
  couponId: z.string().cuid(),
  productId: z.string().cuid().optional().nullable(),
  variantId: z.string().cuid().optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
});

export async function saveCoupon(id: string | null, form: FormData) {
  const admin = await requireAdmin();
  const parsed = couponFields.safeParse(Object.fromEntries(form));
  const target = id ? '/admin/cupones/' + encodeURIComponent(id) : '/admin/cupones';
  if (!parsed.success) redirect(target + '?error=invalid');

  try {
    await prisma.$transaction(async (tx) => {
      const data = {
        ...parsed.data,
        value: parsed.data.value,
        minOrderAmount: parsed.data.minOrderAmount ?? null,
        maxDiscount: parsed.data.maxDiscount ?? null,
        usageLimit: parsed.data.usageLimit ? Number(parsed.data.usageLimit) : null,
        perCustomerLimit: parsed.data.perCustomerLimit,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        startDate: new Date(parsed.data.startDate),
        promotionId: parsed.data.promotionId || null,
      };

      const coupon = id
        ? await tx.coupon.update({ where: { id }, data })
        : await tx.coupon.create({ data });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: id ? 'UPDATE' : 'CREATE',
          entityType: 'Coupon',
          entityId: coupon.id,
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

  revalidatePath('/admin/cupones');
  redirect('/admin/cupones?saved=1');
}

export async function deleteCoupon(id: string) {
  const admin = await requireAdmin();
  await prisma.$transaction(async (tx) => {
    await tx.couponProduct.deleteMany({ where: { couponId: id } });
    await tx.couponCustomer.deleteMany({ where: { couponId: id } });
    await tx.cartCoupon.deleteMany({ where: { couponId: id } });
    await tx.coupon.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        userId: admin.id,
        action: 'DELETE',
        entityType: 'Coupon',
        entityId: id,
      },
    });
  });
  revalidatePath('/admin/cupones');
  redirect('/admin/cupones?deleted=1');
}

export async function addCouponProduct(form: FormData) {
  const admin = await requireAdmin();
  const parsed = couponProductFields.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Datos inválidos' };

  if (!parsed.data.productId && !parsed.data.variantId && !parsed.data.categoryId) {
    return { error: 'Debe seleccionar al menos un producto, variante o categoría' };
  }

  try {
    await prisma.couponProduct.create({ data: parsed.data });
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'CREATE',
        entityType: 'CouponProduct',
        entityId: parsed.data.couponId,
        newData: parsed.data,
      },
    });
    revalidatePath('/admin/cupones/' + parsed.data.couponId);
    return { success: true };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return { error: 'Esta relación ya existe' };
    }
    throw error;
  }
}

export async function removeCouponProduct(id: string, couponId: string) {
  const admin = await requireAdmin();
  await prisma.couponProduct.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'DELETE',
      entityType: 'CouponProduct',
      entityId: couponId,
      oldData: { id },
    },
  });
  revalidatePath('/admin/cupones/' + couponId);
  return { success: true };
}

export async function toggleCouponStatus(id: string, isActive: boolean) {
  const admin = await requireAdmin();
  await prisma.coupon.update({ where: { id }, data: { isActive } });
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'UPDATE',
      entityType: 'Coupon',
      entityId: id,
      newData: { isActive },
    },
  });
  revalidatePath('/admin/cupones');
  return { success: true };
}