import { NextResponse, type NextRequest } from 'next/server';
// Fail closed: el panel no tiene autenticación administrativa verificada todavía.
export function middleware(_request: NextRequest) {
  return new NextResponse('Administrador temporalmente deshabilitado', { status: 503, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
