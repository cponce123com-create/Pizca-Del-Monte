import { NextResponse } from 'next/server';

export function middleware() {
  const secret = process.env.ADMIN_AUTH_SECRET;
  if (!process.env.DATABASE_URL || !secret || secret.length < 32 ||
      secret === process.env.AUTH_SECRET || secret === process.env.NEXTAUTH_SECRET) {
    return new NextResponse('Administrador sin configurar', {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
    });
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
