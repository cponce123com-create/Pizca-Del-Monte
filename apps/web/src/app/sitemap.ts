import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base || !/^https?:\/\//.test(base)) return [];
  const origin = new URL(base).origin;
  return ['/', '/tienda'].map(path => ({ url: `${origin}${path}`, changeFrequency: 'weekly' as const, priority: path === '/' ? 1 : 0.8 }));
}
