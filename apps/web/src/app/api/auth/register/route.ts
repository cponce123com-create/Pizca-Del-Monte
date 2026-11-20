import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
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

    const { firstName, lastName, email, password, phone, newsletter } = parsed.data;

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
        phoneVerified: phone ? new Date() : null,
        status: 'ACTIVE',
        emailVerified: new Date(), // En producción: enviar email de verificación
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

    // Asignar rol por defecto (cliente)
    const customerRole = await prisma.roleModel.findUnique({
      where: { name: 'CUSTOMER' },
    });

    // Si no existe rol CUSTOMER, no asignamos (se manejará en frontend)
    // El usuario tendrá rol básico por defecto

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