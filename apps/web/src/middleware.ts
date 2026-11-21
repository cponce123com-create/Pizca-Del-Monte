import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';

// Middleware Edge: nunca importar Prisma ni bcryptjs aquí.
const { auth } = NextAuth({
  providers: [],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login', error: '/login' },
});

const protectedRoutes = ['/cuenta', '/pedidos', '/direcciones', '/favoritos'];
export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const isProtected = protectedRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));
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
