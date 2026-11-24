import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@pizca/database';
import { z } from 'zod';
import { isDemoMode } from '@/lib/demo-mode';
import { checkAuthRateLimits, getClientIp } from '@/lib/security/auth-rate-limit';

const registerSchema = z.object({
  firstName: z.string().min(2, 'Nombre muy corto'),
  lastName: z.string().min(2, 'Apellido muy corto'),
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').regex(/[A-Z]/, 'Debe tener mayúscula').regex(/[a-z]/, 'Debe tener minúscula').regex(/[0-9]/, 'Debe tener número'),
  phone: z.string().regex(/^\+?51\s?9\d{8}$/, 'Teléfono inválido').optional().or(z.literal('')),
  newsletter: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  if (isDemoMode()) return NextResponse.json({ message: 'El registro estará disponible cuando la tienda esté configurada.' }, { status: 503 });

  const ipLimit = await checkAuthRateLimits([
    { scope: 'register:ip', identifier: getClientIp(request.headers) },
  ]);
  if (ipLimit.status === 'limited') {
    return NextResponse.json(
      { message: 'Demasiados intentos. Inténtalo de nuevo más tarde.' },
      { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds), 'Cache-Control': 'no-store' } }
    );
  }
  if (ipLimit.status === 'unavailable') {
    return NextResponse.json(
      { message: 'El registro no está disponible temporalmente.' },
      { status: 503, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Datos inválidos', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { firstName, lastName, password, phone, newsletter } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();

    const identityLimit = await checkAuthRateLimits([
      { scope: 'register:identity', identifier: email },
    ]);
    if (identityLimit.status === 'limited') {
      return NextResponse.json(
        { message: 'Demasiados intentos. Inténtalo de nuevo más tarde.' },
        { status: 429, headers: { 'Retry-After': String(identityLimit.retryAfterSeconds), 'Cache-Control': 'no-store' } }
      );
    }
    if (identityLimit.status === 'unavailable') {
      return NextResponse.json(
        { message: 'El registro no está disponible temporalmente.' },
        { status: 503, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } }
      );
    }

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

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: `${firstName} ${lastName}`,
        passwordHash,
        phone: phone || null,
        phoneVerified: null, // Solo marcar tras verificar el número
        status: 'ACTIVE',
        emailVerified: null, // Solo marcar tras confirmar un enlace de verificación
        locale: 'es-PE',
        timezone: 'America/Lima',
        currency: 'PEN',
      },
    });

    // Crear perfil de cliente
    await prisma.customer.create({
      data: {
        userId: user.id,
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone: phone || null,
        marketingConsent: newsletter,
      },
    });

    // Los compradores no reciben permisos administrativos.

    return NextResponse.json(
      { message: 'Cuenta creada exitosamente', userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
