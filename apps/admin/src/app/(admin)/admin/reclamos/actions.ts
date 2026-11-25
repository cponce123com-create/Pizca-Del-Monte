'use server';

import { prisma } from '@pizca/database';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';

const responseFields = z.object({
  id: z.string().cuid(),
  response: z.string().trim().min(10).max(5000),
  status: z.enum(['EN_TRAMITE', 'RESUELTO', 'ARCHIVADO', 'RECHAZADO']),
  resolutionCode: z.string().trim().max(20).optional().nullable(),
  followUpRequired: z.enum(['on', 'off']).transform(v => v === 'on').default('off'),
  followUpDate: z.string().datetime().optional().nullable(),
});

export async function respondToComplaint(form: FormData) {
  const admin = await requireAdmin();
  const parsed = responseFields.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'Datos inválidos' };

  try {
    await prisma.$transaction(async (tx) => {
      const complaint = await tx.complaintBookEntry.findUnique({ where: { id: parsed.data.id } });
      if (!complaint) throw new Error('Reclamo no encontrado');

      await tx.complaintBookEntry.update({
        where: { id: parsed.data.id },
        data: {
          status: parsed.data.status,
          response: parsed.data.response,
          respondedAt: new Date(),
          respondedBy: admin.id,
          resolutionCode: parsed.data.resolutionCode || null,
          followUpRequired: parsed.data.followUpRequired,
          followUpDate: parsed.data.followUpDate ? new Date(parsed.data.followUpDate) : null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: 'UPDATE',
          entityType: 'ComplaintBookEntry',
          entityId: parsed.data.id,
          oldData: { status: complaint.status },
          newData: { status: parsed.data.status, response: parsed.data.response },
        },
      });
    });
  } catch (error) {
    throw error;
  }

  revalidatePath('/admin/reclamos');
  return { success: true };
}

export async function updateComplaintStatus(id: string, status: string) {
  const admin = await requireAdmin();
  await prisma.complaintBookEntry.update({
    where: { id },
    data: { status: status as any },
  });
  await prisma.auditLog.create({
    data: { userId: admin.id, action: 'UPDATE', entityType: 'ComplaintBookEntry', entityId: id, newData: { status } },
  });
  revalidatePath('/admin/reclamos');
  return { success: true };
}

export async function exportComplaints(startDate: string, endDate: string) {
  const admin = await requireAdmin();
  const complaints = await prisma.complaintBookEntry.findMany({
    where: {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  await prisma.auditLog.create({
    data: { userId: admin.id, action: 'EXPORT', entityType: 'ComplaintBookEntry', metadata: { startDate, endDate, count: complaints.length } },
  });

  return complaints;
}