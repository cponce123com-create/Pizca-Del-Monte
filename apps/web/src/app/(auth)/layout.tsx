import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { isDemoMode } from '@/lib/demo-mode';
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col"><a href="#contenido-auth" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[999] focus:rounded focus:bg-background focus:p-3">Saltar al contenido</a><Header isDemo={isDemoMode()} /><div id="contenido-auth" className="flex-1">{children}</div><Footer /></div>;
}
