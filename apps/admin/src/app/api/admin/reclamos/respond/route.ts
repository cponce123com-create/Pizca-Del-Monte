import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { requireAdmin } from '@/lib/auth/require-admin';
import { z } from 'zod';

const schema = z.object({
  id: z.string().cuid(),
  response: z.string().trim().min(10).max(5000),
  status: z.enum(['EN_TRAMITE', 'RESUELTO', 'ARCHIVADO', 'RECHAZADO']),
  resolutionCode: z.string().trim().max(20).optional().nullable(),
  followUpRequired: z.boolean().default(false),
  followUpDate: z.string().datetime().optional().nullable(),
});

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

    const { id, response, status, resolutionCode, followUpRequired, followUpDate } = parsed.data;

    const complaint = await prisma.complaintBookEntry.findUnique({ where: { id } });
    if (!complaint) {
      return NextResponse.json({ error: 'Reclamo no encontrado' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.complaintBookEntry.update({
        where: { id },
        data: {
          status,
          response,
          respondedAt: new Date(),
          respondedBy: admin.id,
          resolutionCode: resolutionCode || null,
          followUpRequired,
          followUpDate: followUpDate ? new Date(followUpDate) : null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: 'UPDATE',
          entityType: 'ComplaintBookEntry',
          entityId: id,
          oldData: { status: complaint.status },
          newData: { status, response, resolutionCode, followUpRequired },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error responding to complaint:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}