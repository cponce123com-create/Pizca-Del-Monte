'use client';

import { useState } from 'react';

const demoImages = {
  spice: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=900&q=85',
  salt: 'https://images.unsplash.com/photo-1518110925495-5fe2b0ba94a9?w=900&q=85',
  oil: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=900&q=85',
  sauce: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=900&q=85',
  gift: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=900&q=85',
  cooking: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=900&q=85',
} as const;

export function demoProductImage(name: string, category = ''): string {
  const text = (name + ' ' + category).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/sal|maras/.test(text)) return demoImages.salt;
  if (/aceite|oliva|vinagre/.test(text)) return demoImages.oil;
  if (/salsa|aderezo|huancaina|ocopa/.test(text)) return demoImages.sauce;
  if (/pack|regalo|caja|kit/.test(text)) return demoImages.gift;
  if (/mortero|frasco|molinillo|accesorio/.test(text)) return demoImages.cooking;
  return demoImages.spice;
}

interface DemoProductImageProps {
  name: string;
  src?: string | null;
  alt?: string | null;
  category?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export function DemoProductImage({ name, src, alt, category, className, loading = 'lazy' }: DemoProductImageProps) {
  const fallback = demoProductImage(name, category);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const imageSrc = src && failedSrc !== src ? src : fallback;
  return (
    <div className="relative h-full w-full">
      {fallbackFailed ? (
        <div role="img" aria-label={alt || name} className="flex h-full w-full items-center justify-center bg-amber-50 text-amber-800">
          <span className="px-4 text-center text-sm font-medium">{name}</span>
        </div>
      ) : (
        <img
          src={imageSrc}
          alt={alt || name}
          loading={loading}
          className={className || 'h-full w-full object-cover'}
          onError={() => {
            if (imageSrc === fallback) setFallbackFailed(true);
            else setFailedSrc(src || null);
          }}
        />
      )}
      {imageSrc === fallback && !fallbackFailed && (
        <span className="absolute bottom-2 left-2 rounded bg-black/65 px-2 py-1 text-[10px] font-medium text-white">Imagen referencial</span>
      )}
    </div>
  );
}
