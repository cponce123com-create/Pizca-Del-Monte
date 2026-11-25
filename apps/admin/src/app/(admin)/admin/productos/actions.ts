'use server';

import { prisma } from '@pizca/database';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';

const productFields = z.object({
  sku: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(180),
  slug: z.string().trim().max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(10000),
  basePrice: z.string().trim().regex(/^\d{1,10}(?:\.\d{1,2})?$/),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'OUT_OF_STOCK', 'DISCONTINUED']),
});

export async function saveProduct(id: string | null, form: FormData) {
  const admin = await requireAdmin();
  const parsed = productFields.safeParse(Object.fromEntries(form));
  const target = id ? '/admin/productos/' + encodeURIComponent(id) : '/admin/productos';
  if (!parsed.success) redirect(target + '?error=invalid');

  try {
    await prisma.$transaction(async (tx) => {
      const product = id
        ? await tx.product.update({ where: { id }, data: parsed.data })
        : await tx.product.create({ data: { ...parsed.data, metaKeywords: [], inventory: { create: {} } } });
      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: id ? 'UPDATE' : 'CREATE',
          entityType: 'Product',
          entityId: product.id,
          newData: parsed.data,
        },
      });
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      redirect(target + '?error=duplicate');
    }
    throw error;
  }

  revalidatePath('/admin/productos');
  redirect('/admin/productos?saved=1');
}
