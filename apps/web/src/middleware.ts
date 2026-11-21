import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { requiresSession } from '@/lib/route-access';

// Middleware Edge: nunca importar Prisma ni bcryptjs aquí.
const { auth } = NextAuth({
  providers: [],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login', error: '/login' },
});

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const isProtected = requiresSession(pathname);
  if (isProtected && !req.auth) {
    const url = new URL('/login', req.nextUrl);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }
  // El checkout será público cuando se implemente la compra como invitado en Fase 1.
  // Por ahora, el endpoint de checkout sigue requiriendo sesión.
  return NextResponse.next();
});
export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'] };
