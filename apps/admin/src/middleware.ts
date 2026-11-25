import { isAdminDemo } from './lib/demo/mode';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request?: NextRequest) {
  const pathname = request?.nextUrl.pathname;
  if (isAdminDemo() && pathname) {
    if (pathname === '/login' || pathname === '/demo') return NextResponse.next();
    return new NextResponse(null, { status: 307, headers: { Location: '/login' } });
  }
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
