import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { isDemoMode } from '@/lib/demo-mode';
export const dynamic = 'force-dynamic';
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const demo = isDemoMode();
  return <div className="flex min-h-screen flex-col"><Header isDemo={demo} />{demo && <div className="border-b border-ochre-200 bg-ochre-50 px-4 py-2.5 text-center text-xs font-medium text-ochre-950" role="status"><span className="mr-2 inline-flex rounded-full bg-ochre-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Demo</span>Tienda de demostración: productos, imágenes y precios referenciales. No se realizan compras reales.</div>}<main id="contenido" className="flex-1">{children}</main><Footer /></div>;
}
