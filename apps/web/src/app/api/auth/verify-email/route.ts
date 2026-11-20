import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { prisma } from '@pizca/database';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const raw = new URL(request.url).searchParams.get('token');
  if (!raw || !/^[a-f0-9]{64}$/.test(raw)) {
    return NextResponse.json({ message: 'Enlace de verificación inválido.' }, { status: 400 });
  }
  const digest = createHash('sha256').update(raw).digest('hex');
  const now = new Date();
  try {
    const success = await prisma.$transaction(async (tx) => {
      const record = await tx.emailVerificationToken.findUnique({ where: { token: digest } });
      if (!record || record.usedAt || record.expiresAt <= now) return false;
      const used = await tx.emailVerificationToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (used.count !== 1) return false;
      await tx.user.update({
        where: { id: record.userId },
        data: { emailVerified: now, status: 'ACTIVE' },
      });
      return true;
    });
    if (!success) {
      return NextResponse.json({ message: 'El enlace expiró o ya fue utilizado.' }, { status: 400 });
    }
    return NextResponse.redirect(new URL('/login?verified=true', request.url));
  } catch (error) {
    console.error('Email verification failed:', error);
    return NextResponse.json({ message: 'No se pudo completar la verificación.' }, { status: 500 });
  }
}
