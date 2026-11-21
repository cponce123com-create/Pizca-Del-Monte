import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { isDemoMode } from '@/lib/demo-mode';
export default function NotFound() {
  return <div className="flex min-h-screen flex-col"><Header isDemo={isDemoMode()} /><main className="mx-auto flex-1 max-w-xl px-6 py-24 text-center"><h1 className="font-heading text-3xl font-semibold">Página no encontrada</h1><p className="mt-4 text-muted-foreground">La dirección solicitada no existe.</p><Link className="mt-6 inline-block rounded-lg bg-primary px-5 py-3 text-primary-foreground" href="/">Volver al inicio</Link></main><Footer /></div>;
}
