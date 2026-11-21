'use client';
import Image from 'next/image';
import { useState } from 'react';

export function demoProductImage(name: string, category = ''): string {
  const text = (name + ' ' + category).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/salsa|mezcla|aderezo/.test(text)) return '/demo/mezclas-salsas.webp';
  if (/sal|maras/.test(text)) return '/demo/sales-gourmet.webp';
  if (/aceite|oliva|vinagre/.test(text)) return '/demo/aceites-vinagres.webp';
  if (/pack|regalo|caja|kit/.test(text)) return '/demo/packs-gourmet.webp';
  if (/mortero|frasco|molinillo|accesorio/.test(text)) return '/demo/accesorios.webp';
  return '/demo/especias.webp';
}
interface DemoProductImageProps { name: string; src?: string | null; alt?: string | null; category?: string; className?: string; loading?: 'lazy' | 'eager'; }
export function DemoProductImage({ name, src, alt, category, className, loading = 'lazy' }: DemoProductImageProps) {
  const fallback = demoProductImage(name, category);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const imageSrc = src && failedSrc !== src ? src : fallback;
  return <div className="relative h-full w-full">{fallbackFailed ? <div role="img" aria-label={alt || name} className="flex h-full w-full items-center justify-center bg-amber-50 text-amber-800"><span className="px-4 text-center text-sm font-medium">{name}</span></div> : <Image src={imageSrc} alt={alt || `Imagen referencial de ${name}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" loading={loading} className={className || 'h-full w-full object-cover'} onError={() => { if (imageSrc === fallback) setFallbackFailed(true); else setFailedSrc(src || null); }} />}
    {(imageSrc.startsWith('/demo/') || imageSrc === fallback) && !fallbackFailed && <span className="absolute bottom-2 left-2 rounded bg-black/65 px-2 py-1 text-[10px] font-medium text-white">Imagen referencial</span>}
  </div>;
}
