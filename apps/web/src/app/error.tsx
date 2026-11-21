'use client';
import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { logger.error('Error de página:', error); }, [error]);
  return <div className="flex min-h-screen flex-col"><Header isDemo /><main className="mx-auto flex-1 max-w-xl px-6 py-24 text-center"><h1 className="font-heading text-2xl font-bold">No pudimos cargar esta página</h1><p className="my-4 text-muted-foreground">Intenta nuevamente en unos momentos.</p><button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground focus-visible:outline focus-visible:outline-2" onClick={reset}>Reintentar</button></main><Footer /></div>;
}
