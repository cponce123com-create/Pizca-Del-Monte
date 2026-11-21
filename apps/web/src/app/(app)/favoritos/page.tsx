import Link from 'next/link';
import { isDemoMode } from '@/lib/demo-mode';
import { DemoFavorites } from './DemoFavorites';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mis favoritos', robots: { index: false, follow: false } };
export default function FavoritesPage() {
  if (isDemoMode()) return <DemoFavorites />;
  return <div className="container py-16"><h1 className="font-heading text-3xl font-semibold">Mis favoritos</h1><p className="mt-4 text-muted-foreground">La sincronización de favoritos con tu cuenta está en preparación.</p><Link className="mt-6 inline-block underline" href="/tienda">Explorar productos</Link></div>;
}
