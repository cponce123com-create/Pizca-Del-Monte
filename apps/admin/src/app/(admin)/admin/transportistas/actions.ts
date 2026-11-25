'use server';

import { prisma } from '@pizca/database';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';

const carrierFields = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  code: z.string().trim().min(1).max(20).toUpperCase(),
  type: z.enum(['courier', 'postal', 'pickup', 'own']).default('courier'),
  apiEndpoint: z.string().url().optional().or(z.literal('')),
  apiKey: z.string().trim().optional(),
  apiSecret: z.string().trim().optional(),
  trackingUrl: z.string().url().optional().or(z.literal('')),
  supportsPickup: z.enum(['on', 'off']).transform(v => v === 'on').default('off'),
  supportsDropoff: z.enum(['on', 'off']).transform(v => v === 'on').default('off'),
  maxWeight: z.string().trim().regex(/^\d{1,6}(?:\.\d{1,3})?$/).optional().nullable(),
  maxDimensions: z.string().optional().nullable(),
  isActive: z.enum(['on', 'off']).transform(v => v === 'on').default('on'),
  priority: z.string().trim().regex(/^\d{1,3}$/).transform(Number).default('0'),
  config: z.string().optional().nullable(),
});

const zoneFields = z.object({
  carrierId: z.string().cuid(),
  name: z.string().trim().min(1).max(120),
  countries: z.string().optional().default('PE'),
  regions: z.string().optional(),
  provinces: z.string().optional(),
  districts: z.string().optional(),
  postalCodes: z.string().optional(),
  isActive: z.enum(['on', 'off']).transform(v => v === 'on').default('on'),
});

const rateFields = z.object({
  zoneId: z.string().cuid(),
  name: z.string().trim().min(1).max(120),
  minWeight: z.string().trim().regex(/^\d{1,6}(?:\.\d{1,3})?$/).default('0'),
  maxWeight: z.string().trim().regex(/^\d{1,6}(?:\.\d{1,3})?$/).optional().nullable(),
  minOrderAmount: z.string().trim().regex(/^\d{1,10}(?:\.\d{1,2})?$/).optional().nullable(),
  maxOrderAmount: z.string().trim().regex(/^\d{1,10}(?:\.\d{1,2})?$/).optional().nullable(),
  basePrice: z.string().trim().regex(/^\d{1,10}(?:\.\d{1,2})?$/),
  pricePerKg: z.string().trim().regex(/^\d{1,10}(?:\.\d{1,2})?$/).default('0'),
  pricePerKm: z.string().trim().regex(/^\d{1,10}(?:\.\d{1,2})?$/).default('0'),
  estimatedDays: z.string().trim().regex(/^\d{1,3}$/).transform(Number),
  isActive: z.enum(['on', 'off']).transform(v => v === 'on').default('on'),
  sortOrder: z.string().trim().regex(/^\d{1,3}$/).transform(Number).default('0'),
});

const ruleFields = z.object({
  productId: z.string().cuid().optional().nullable(),
  variantId: z.string().cuid().optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
  carrierId: z.string().cuid().optional().nullable(),
  zoneId: z.string().cuid().optional().nullable(),
  freeShipping: z.enum(['on', 'off']).transform(v => v === 'on').default('off'),
  fixedPrice: z.string().trim().regex(/^\d{1,10}(?:\.\d{1,2})?$/).optional().nullable(),
  multiplier: z.string().trim().regex(/^\d{1,3}(?:\.\d{1,2})?$/).transform(Number).default('1.0'),
  minQty: z.string().trim().regex(/^\d{1,3}$/).transform(Number).default('1'),
  maxQty: z.string().trim().regex(/^\d{1,3}$/).transform(Number).optional().nullable(),
  isActive: z.enum(['on', 'off']).transform(v => v === 'on').default('on'),
  priority: z.string().trim().regex(/^\d{1,3}$/).transform(Number).default('0'),
});

// Carrier CRUD
export async function saveCarrier(id: string | null, form: FormData) {
  const admin = await requireAdmin();
  const parsed = carrierFields.safeParse(Object.fromEntries(form));
  const target = id ? '/admin/transportistas/' + encodeURIComponent(id) : '/admin/transportistas';
  if (!parsed.success) redirect(target + '?error=invalid');

  try {
    await prisma.$transaction(async (tx) => {
      const data = {
        ...parsed.data,
        apiEndpoint: parsed.data.apiEndpoint || null,
        apiKey: parsed.data.apiKey || null,
        apiSecret: parsed.data.apiSecret || null,
        trackingUrl: parsed.data.trackingUrl || null,
        maxWeight: parsed.data.maxWeight ? Number(parsed.data.maxWeight) : null,
        maxDimensions: parsed.data.maxDimensions ? JSON.parse(parsed.data.maxDimensions) : null,
        config: parsed.data.config ? JSON.parse(parsed.data.config) : null,
      };

      const carrier = id
        ? await tx.carrier.update({ where: { id }, data })
        : await tx.carrier.create({ data });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: id ? 'UPDATE' : 'CREATE',
          entityType: 'Carrier',
          entityId: carrier.id,
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

  revalidatePath('/admin/transportistas');
  redirect('/admin/transportistas?saved=1');
}

export async function deleteCarrier(id: string) {
  const admin = await requireAdmin();
  await prisma.$transaction(async (tx) => {
    await tx.shippingRule.deleteMany({ where: { carrierId: id } });
    await tx.shippingRate.deleteMany({ where: { zone: { carrierId: id } } });
    await tx.shippingZone.deleteMany({ where: { carrierId: id } });
    await tx.carrier.delete({ where: { id } });
    await tx.auditLog.create({
      data: { userId: admin.id, action: 'DELETE', entityType: 'Carrier', entityId: id },
    });
  });
  revalidatePath('/admin/transportistas');
  redirect('/admin/transportistas?deleted=1');
}

// Zone CRUD
export async function saveZone(carrierId: string, id: string | null, form: FormData) {
  const admin = await requireAdmin();
  const parsed = zoneFields.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Datos inválidos' };

  try {
    await prisma.$transaction(async (tx) => {
      const data = {
        ...parsed.data,
        countries: parsed.data.countries.split(',').map(s => s.trim()).filter(Boolean),
        regions: parsed.data.regions ? parsed.data.regions.split(',').map(s => s.trim()).filter(Boolean) : [],
        provinces: parsed.data.provinces ? parsed.data.provinces.split(',').map(s => s.trim()).filter(Boolean) : [],
        districts: parsed.data.districts ? parsed.data.districts.split(',').map(s => s.trim()).filter(Boolean) : [],
        postalCodes: parsed.data.postalCodes ? parsed.data.postalCodes.split(',').map(s => s.trim()).filter(Boolean) : [],
      };

      const zone = id
        ? await tx.shippingZone.update({ where: { id }, data })
        : await tx.shippingZone.create({ data: { ...data, carrierId } });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: id ? 'UPDATE' : 'CREATE',
          entityType: 'ShippingZone',
          entityId: zone.id,
          newData: data,
        },
      });
    });
  } catch (error) {
    throw error;
  }

  revalidatePath('/admin/transportistas/' + carrierId);
  return { success: true };
}

export async function deleteZone(id: string, carrierId: string) {
  const admin = await requireAdmin();
  await prisma.$transaction(async (tx) => {
    await tx.shippingRate.deleteMany({ where: { zoneId: id } });
    await tx.shippingRule.deleteMany({ where: { zoneId: id } });
    await tx.shippingZone.delete({ where: { id } });
    await tx.auditLog.create({ data: { userId: admin.id, action: 'DELETE', entityType: 'ShippingZone', entityId: id } });
  });
  revalidatePath('/admin/transportistas/' + carrierId);
  return { success: true };
}

// Rate CRUD
export async function saveRate(zoneId: string, id: string | null, form: FormData) {
  const admin = await requireAdmin();
  const parsed = rateFields.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Datos inválidos' };

  try {
    await prisma.$transaction(async (tx) => {
      const data = {
        ...parsed.data,
        minWeight: Number(parsed.data.minWeight),
        maxWeight: parsed.data.maxWeight ? Number(parsed.data.maxWeight) : null,
        minOrderAmount: parsed.data.minOrderAmount ? Number(parsed.data.minOrderAmount) : null,
        maxOrderAmount: parsed.data.maxOrderAmount ? Number(parsed.data.maxOrderAmount) : null,
        basePrice: Number(parsed.data.basePrice),
        pricePerKg: Number(parsed.data.pricePerKg),
        pricePerKm: Number(parsed.data.pricePerKm),
        estimatedDays: parsed.data.estimatedDays,
        sortOrder: parsed.data.sortOrder,
      };

      const rate = id
        ? await tx.shippingRate.update({ where: { id }, data })
        : await tx.shippingRate.create({ data: { ...data, zoneId } });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: id ? 'UPDATE' : 'CREATE',
          entityType: 'ShippingRate',
          entityId: rate.id,
          newData: data,
        },
      });
    });
  } catch (error) {
    throw error;
  }

  revalidatePath('/admin/transportistas');
  return { success: true };
}

export async function deleteRate(id: string) {
  const admin = await requireAdmin();
  await prisma.$transaction(async (tx) => {
    await tx.shippingRate.delete({ where: { id } });
    await tx.auditLog.create({ data: { userId: admin.id, action: 'DELETE', entityType: 'ShippingRate', entityId: id } });
  });
  revalidatePath('/admin/transportistas');
  return { success: true };
}

// Rule CRUD
export async function saveRule(id: string | null, form: FormData) {
  const admin = await requireAdmin();
  const parsed = ruleFields.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Datos inválidos' };

  // Validar que al menos uno esté presente
  if (!parsed.data.productId && !parsed.data.variantId && !parsed.data.categoryId && !parsed.data.carrierId && !parsed.data.zoneId) {
    return { error: 'Debe especificar al menos un criterio (producto, variante, categoría, transportista o zona)' };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const data = {
        ...parsed.data,
        fixedPrice: parsed.data.fixedPrice ? Number(parsed.data.fixedPrice) : null,
        multiplier: parsed.data.multiplier,
        minQty: parsed.data.minQty,
        maxQty: parsed.data.maxQty,
        priority: parsed.data.priority,
      };

      const rule = id
        ? await tx.shippingRule.update({ where: { id }, data })
        : await tx.shippingRule.create({ data });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: id ? 'UPDATE' : 'CREATE',
          entityType: 'ShippingRule',
          entityId: rule.id,
          newData: data,
        },
      });
    });
  } catch (error) {
    throw error;
  }

  revalidatePath('/admin/transportistas');
  return { success: true };
}

export async function deleteRule(id: string) {
  const admin = await requireAdmin();
  await prisma.shippingRule.delete({ where: { id } });
  await prisma.auditLog.create({ data: { userId: admin.id, action: 'DELETE', entityType: 'ShippingRule', entityId: id } });
  revalidatePath('/admin/transportistas');
  return { success: true };
}