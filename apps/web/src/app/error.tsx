'use client';
import { logger } from '@/lib/logger';
import { useEffect } from 'react';
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { logger.error('Error de página:', error); }, [error]);
  return <main className="mx-auto max-w-xl px-6 py-24 text-center"><h1 className="text-2xl font-bold">No pudimos cargar esta página</h1><p className="my-4">Intenta nuevamente en unos momentos.</p><button className="rounded bg-black px-4 py-2 text-white" onClick={reset}>Reintentar</button></main>;
}
