import { auth } from '@/lib/auth/config';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas que requieren autenticación
const protectedRoutes = ['/cuenta', '/checkout', '/pedidos', '/direcciones', '/favoritos'];

// Rutas públicas (no requieren autenticación)
const publicRoutes = ['/login', '/registro', '/recuperar-contrasena', '/api/auth'];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isProtected = protectedRoutes.some((route) => nextUrl.pathname.startsWith(route));
  const isPublic = publicRoutes.some((route) => nextUrl.pathname.startsWith(route));

  // Si la ruta está protegida y el usuario no está logueado
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si el usuario está logueado y intenta acceder a login/registro, redirigir a cuenta
  if (isLoggedIn && (nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/registro'))) {
    return NextResponse.redirect(new URL('/cuenta', nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes that don't need auth
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\.png$|.*\.jpg$|.*\.svg$|.*\.ico$|public|api/(?!auth)).*)',
  ],
};
