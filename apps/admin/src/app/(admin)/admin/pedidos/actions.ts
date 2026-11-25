'use server';

import { prisma } from '@pizca/database';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';

const stages = {
  PAYMENT_CONFIRMED: 'PREPARING',
  PREPARING: 'READY_TO_SHIP',
} as const;

export async function advancePreparation(id: string, expected: string) {
  const admin = await requireAdmin();
  const path = '/admin/pedidos/' + encodeURIComponent(id);
  if (expected !== 'PAYMENT_CONFIRMED' && expected !== 'PREPARING') redirect(path + '?error=transition');
  const next = stages[expected];
  const changed = await prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({ where: { id, status: expected }, data: { status: next } });
    if (result.count !== 1) return false;
    await tx.orderStatusHistory.create({ data: { orderId: id, fromStatus: expected, toStatus: next, createdBy: admin.id } });
    await tx.auditLog.create({
      data: {
        userId: admin.id, action: 'UPDATE', entityType: 'Order', entityId: id, orderId: id,
        oldData: { status: expected }, newData: { status: next },
      },
    });
    return true;
  });
  if (!changed) redirect(path + '?error=transition');
  revalidatePath('/admin/pedidos');
  redirect(path + '?saved=1');
}
