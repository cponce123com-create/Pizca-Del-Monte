'use server';

import { prisma } from '@pizca/database';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';

const adjustmentFields = z.object({
  quantity: z.string().regex(/^\d{1,9}$/).transform(Number),
  reason: z.string().trim().min(3).max(300),
});

export async function adjustStock(id: string, expectedQuantity: number, form: FormData) {
  const admin = await requireAdmin();
  const data = adjustmentFields.safeParse(Object.fromEntries(form));
  if (!data.success) redirect('/admin/inventario?error=invalid');

  const outcome = await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({
      where: { id }, include: { _count: { select: { lots: true } } },
    });
    if (!item?.productId || item.variantId || item._count.lots || data.data.quantity < item.reservedQty) return 'invalid';

    if (item.quantity !== expectedQuantity) return 'conflict';
    const quantity = data.data.quantity;
    if (quantity === item.quantity) return 'saved';
    const delta = quantity - item.quantity;
    const updated = await tx.inventoryItem.updateMany({
      where: { id, quantity: item.quantity, reservedQty: item.reservedQty },
      data: { quantity, availableQty: quantity - item.reservedQty, lastMovementAt: new Date() },
    });
    if (!updated.count) return 'conflict';
    await tx.stockMovement.create({
      data: {
        productId: item.productId, inventoryItemId: id, warehouseId: item.warehouseId,
        type: delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT', quantity: delta,
        previousQty: item.quantity, newQty: quantity, notes: data.data.reason, performedBy: admin.id,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: admin.id, action: 'UPDATE', entityType: 'InventoryItem', entityId: id,
        oldData: { quantity: item.quantity }, newData: { quantity, reason: data.data.reason },
      },
    });
    return 'saved';
  });

  revalidatePath('/admin/inventario');
  redirect(outcome === 'saved' ? '/admin/inventario?saved=1' : '/admin/inventario?error=' + outcome);
}
