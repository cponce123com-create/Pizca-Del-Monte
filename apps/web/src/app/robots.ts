import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base || !/^https?:\/\//.test(base)) return { rules: { userAgent: '*', disallow: '/' } };
  const origin = new URL(base).origin;
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/checkout/', '/carrito', '/cuenta/', '/mi-cuenta', '/mis-pedidos', '/mis-direcciones', '/login', '/register', '/admin/'] }],
    sitemap: `${origin}/sitemap.xml`,
  };
}
