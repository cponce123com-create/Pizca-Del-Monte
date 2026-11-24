'use client';

import { useState } from 'react';

const demoImages = [
  'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1518110925495-5fe2b0ba94a9?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=900&q=85',
] as const;

export function demoProductImage(name: string, category = ''): string {
  const text = (name + ' ' + category).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/pack|regalo|caja|kit/.test(text)) return demoImages[4];
  if (/sal|maras/.test(text)) return demoImages[1];
  if (/aceite|oliva|vinagre/.test(text)) return demoImages[2];
  if (/salsa|aderezo|pasta|mermelada|miel/.test(text)) return demoImages[3];
  if (/mortero|frasco|molinillo|accesorio|cuchara|tabla|tazon|pinza/.test(text)) return demoImages[5];
  const hash = [...text].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return demoImages[hash % demoImages.length];
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
