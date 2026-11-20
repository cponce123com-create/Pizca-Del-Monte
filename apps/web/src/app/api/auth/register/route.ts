import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { randomBytes, createHash } from 'node:crypto';
import { sendVerificationEmail, emailDeliveryConfigured } from '@/lib/auth/verification-email';
import { prisma } from '@pizca/database';
import { z } from 'zod';

const registerSchema = z.object({
  firstName: z.string().min(2, 'Nombre muy corto'),
  lastName: z.string().min(2, 'Apellido muy corto'),
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').regex(/[A-Z]/, 'Debe tener mayúscula').regex(/[a-z]/, 'Debe tener minúscula').regex(/[0-9]/, 'Debe tener número'),
  phone: z.string().regex(/^\+?51\s?9\d{8}$/, 'Teléfono inválido').optional().or(z.literal('')),
  newsletter: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Datos inválidos', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    if (!emailDeliveryConfigured()) {
      return NextResponse.json({ message: 'Registro temporalmente no disponible: falta configurar el correo de verificación.' }, { status: 503 });
    }

    const { firstName, lastName, password, phone, newsletter } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Este correo ya está registrado' },
        { status: 409 }
      );
    }

    // Hash de la contraseña
    const passwordHash = await hash(password, 12);

    // La cuenta permanece pendiente hasta que el propietario del correo confirme el enlace.
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name: `${firstName} ${lastName}`,
          passwordHash,
          phone: phone || null,
          phoneVerified: null,
          emailVerified: null,
          status: 'PENDING_VERIFICATION',
          locale: 'es-PE',
          timezone: 'America/Lima',
          currency: 'PEN',
        },
      });
      await tx.customer.create({
        data: {
          userId: created.id,
          firstName,
          lastName,
          email,
          phone: phone || null,
          marketingConsent: newsletter,
          marketingConsentAt: newsletter ? new Date() : null,
        },
      });
      await tx.emailVerificationToken.create({
        data: {
          userId: created.id,
          token: tokenHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      return created;
    });

    try {
      await sendVerificationEmail(email, token);
    } catch (sendError) {
      console.error('Verification email delivery failed:', sendError);
      // Cuenta pendiente; se puede reenviar un enlace desde /api/auth/resend-verification.
      return NextResponse.json(
        { message: 'Cuenta creada, pero no se pudo enviar el correo. Solicita un nuevo enlace de verificación desde el acceso.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { message: 'Cuenta creada. Revisa tu correo y confirma el enlace antes de iniciar sesión.', userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ message: 'Este correo ya está registrado' }, { status: 409 });
    }
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}