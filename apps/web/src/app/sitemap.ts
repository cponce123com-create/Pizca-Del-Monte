import type { MetadataRoute } from 'next';
import { isDemoMode } from '@/lib/demo-mode';
export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  if (isDemoMode()) return [];
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base || !/^https?:\/\//.test(base)) return [];
  const origin = new URL(base).origin;
  return ['/', '/tienda'].map(path => ({ url: `${origin}${path}`, changeFrequency: 'weekly' as const, priority: path === '/' ? 1 : 0.8 }));
}
