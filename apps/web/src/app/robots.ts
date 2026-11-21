import type { MetadataRoute } from 'next';
import { isDemoMode } from '@/lib/demo-mode';
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  if (isDemoMode()) return { rules: { userAgent: '*', disallow: '/' } };
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base || !/^https?:\/\//.test(base)) return { rules: { userAgent: '*', disallow: '/' } };
  const origin = new URL(base).origin;
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/checkout/', '/carrito', '/cuenta/', '/mi-cuenta', '/mis-pedidos', '/mis-direcciones', '/login', '/register', '/admin/'] }],
    sitemap: `${origin}/sitemap.xml`,
  };
}
