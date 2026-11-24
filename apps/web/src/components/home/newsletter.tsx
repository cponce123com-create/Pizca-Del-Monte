import Link from 'next/link';
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react';

export function Newsletter() {
  return (
    <section className="relative overflow-hidden bg-forest-950 py-16 sm:py-20" aria-labelledby="newsletter-heading">
      <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-ochre-500/20 blur-3xl" aria-hidden="true" />
      <div className="container relative">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-ivory-100"><Sparkles className="h-3.5 w-3.5" /> Inspírate con Pizca del Monte</div>
            <h2 id="newsletter-heading" className="font-heading text-4xl font-medium leading-tight tracking-tight text-white sm:text-5xl">Recetas, ingredientes y nuevas ideas para tu mesa.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-ivory-200/80">El boletín estará disponible cuando exista un servicio real de envío y confirmación. Mientras tanto, descubre nuestra selección y cocina a tu manera.</p>
          </div>
          <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm sm:p-6 lg:max-w-xs">
            <BookOpen className="mb-4 h-7 w-7 text-ochre-300" />
            <p className="font-heading text-xl text-white">Empieza por lo esencial</p>
            <p className="mt-2 text-sm leading-6 text-ivory-200/75">Explora especias, sales, aceites y packs curados para descubrir nuevos sabores.</p>
            <Link href="/tienda" className="mt-5 inline-flex items-center gap-2 rounded-full bg-ivory-100 px-5 py-3 text-sm font-semibold text-primary transition-transform hover:scale-[1.02]">Explorar productos <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
        <p className="mt-8 text-xs text-ivory-200/60">Consulta nuestra <Link href="/politica-de-privacidad" className="underline underline-offset-2 hover:text-white">Política de Privacidad</Link>.</p>
      </div>
    </section>
  );
}
