import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@pizca/database';
import { z } from 'zod';
import { emailDeliveryConfigured, sendVerificationEmail } from '@/lib/auth/verification-email';

export async function POST(request: NextRequest) {
  if (!emailDeliveryConfigured()) {
    return NextResponse.json({ message: 'El servicio de correo no está disponible.' }, { status: 503 });
  }
  const body = await request.json().catch(() => null);
  const parsed = z.object({ email: z.string().trim().email() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: 'Correo inválido' }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const message = 'Si la cuenta está pendiente y corresponde a este correo, recibirás un enlace de verificación.';
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== 'PENDING_VERIFICATION' || user.emailVerified) {
      return NextResponse.json({ message });
    }
    const recent = await prisma.emailVerificationToken.findFirst({
      where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) return NextResponse.json({ message });
    const token = randomBytes(32).toString('hex');
    const digest = createHash('sha256').update(token).digest('hex');
    await prisma.emailVerificationToken.create({
      data: { userId: user.id, token: digest, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });
    await sendVerificationEmail(email, token);
    return NextResponse.json({ message });
  } catch (error) {
    console.error('Resend verification failed:', error);
    return NextResponse.json({ message: 'No fue posible procesar el reenvío.' }, { status: 503 });
  }
}
