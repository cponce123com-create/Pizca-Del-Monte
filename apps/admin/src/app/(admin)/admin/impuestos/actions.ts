'use server';

import { prisma } from '@pizca/database';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';

const taxConfigFields = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(['IGV', 'ISC', 'PERCEPCION', 'RETENCION', 'DETRACCION']),
  rate: z.string().trim().regex(/^\d{1,3}(?:\.\d{1,4})?$/),
  isActive: z.enum(['on', 'off']).transform(v => v === 'on').default('on'),
  appliesTo: z.string().optional(),
  exemptions: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  sunatCode: z.string().trim().max(10).optional().nullable(),
});

export async function saveTaxConfig(id: string | null, form: FormData) {
  const admin = await requireAdmin();
  const parsed = taxConfigFields.safeParse(Object.fromEntries(form));
  const target = id ? '/admin/impuestos/' + encodeURIComponent(id) : '/admin/impuestos';
  if (!parsed.success) redirect(target + '?error=invalid');

  try {
    await prisma.$transaction(async (tx) => {
      const data = {
        ...parsed.data,
        rate: parsed.data.rate,
        appliesTo: parsed.data.appliesTo ? parsed.data.appliesTo.split(',').map(s => s.trim()).filter(Boolean) : [],
        exemptions: parsed.data.exemptions ? parsed.data.exemptions.split(',').map(s => s.trim()).filter(Boolean) : [],
        startDate: new Date(parsed.data.startDate),
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        sunatCode: parsed.data.sunatCode || null,
      };

      const config = id
        ? await tx.taxConfiguration.update({ where: { id }, data })
        : await tx.taxConfiguration.create({ data });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: id ? 'UPDATE' : 'CREATE',
          entityType: 'TaxConfiguration',
          entityId: config.id,
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

  revalidatePath('/admin/impuestos');
  redirect('/admin/impuestos?saved=1');
}

export async function deleteTaxConfig(id: string) {
  const admin = await requireAdmin();
  await prisma.$transaction(async (tx) => {
    await tx.taxConfiguration.delete({ where: { id } });
    await tx.auditLog.create({
      data: { userId: admin.id, action: 'DELETE', entityType: 'TaxConfiguration', entityId: id },
    });
  });
  revalidatePath('/admin/impuestos');
  redirect('/admin/impuestos?deleted=1');
}

export async function toggleTaxConfigStatus(id: string, isActive: boolean) {
  const admin = await requireAdmin();
  await prisma.taxConfiguration.update({ where: { id }, data: { isActive } });
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'UPDATE',
      entityType: 'TaxConfiguration',
      entityId: id,
      newData: { isActive },
    },
  });
  revalidatePath('/admin/impuestos');
  return { success: true };
}