import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { isDemoMode } from '@/lib/demo-mode';
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const demo = isDemoMode();
  return <div className="flex min-h-screen flex-col"><a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[999] focus:rounded focus:bg-background focus:p-3 focus:text-foreground">Saltar al contenido</a><Header isDemo={demo} />{demo && <div className="bg-amber-100 px-4 py-3 text-center text-sm text-amber-950" role="status">Tienda en demostración: productos, imágenes y precios referenciales. No se realizan compras reales.</div>}<main id="contenido" className="flex-1">{children}</main><Footer /></div>;
}
