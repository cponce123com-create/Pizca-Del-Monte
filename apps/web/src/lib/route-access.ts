import { isDemoMode } from './demo-mode';

export function requiresSession(pathname: string): boolean {
  const protectedRoutes = ['/cuenta', '/pedidos', '/direcciones', '/favoritos'];
  if (isDemoMode() && (pathname === '/favoritos' || pathname.startsWith('/favoritos/'))) return false;
  return protectedRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));
}
