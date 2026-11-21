import Link from 'next/link';
import { BookOpen, Sparkles } from 'lucide-react';

export function Newsletter() {
  return (
    <section className="relative overflow-hidden bg-primary py-16" aria-labelledby="newsletter-heading">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-primary-foreground">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">Inspírate con Pizca del Monte</span>
          </div>
          <h2 id="newsletter-heading" className="mb-4 font-heading text-3xl font-semibold text-primary-foreground">
            Recetas, ingredientes y nuevas ideas
          </h2>
          <p className="mb-8 text-primary-foreground/85">
            Estamos preparando nuestro boletín de novedades. Mientras tanto, explora
            los ingredientes de nuestra tienda y descubre nuevas combinaciones.
          </p>
          <Link href="/tienda" className="inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-6 py-3 font-semibold text-primary hover:bg-primary-foreground/90">
            <BookOpen className="h-4 w-4" />
            Explorar productos
          </Link>
          <p className="mt-6 text-xs text-primary-foreground/70">
            El formulario de suscripción se habilitará cuando exista un servicio real de envío y confirmación.
            Consulta nuestra <Link href="/politica-de-privacidad" className="underline hover:text-primary-foreground">Política de Privacidad</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}
