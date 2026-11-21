'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles, Truck, Shield, RotateCcw } from 'lucide-react';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-hero py-20 lg:py-32">
      <div className="absolute inset-0 -z-10 bg-cover bg-center opacity-20" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1800&q=85)" }} aria-hidden="true" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background/95 via-background/85 to-background/60" aria-hidden="true" />
      <div className="container">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="primary" className="mb-6 inline-flex items-center gap-2">
            <Sparkles className="h-3 w-3" />
            Nuevo: Packs Gourmet para Regalar
          </Badge>
          <h1 className="text-display-xl font-heading font-medium text-foreground mb-6">
            El Sabor del Perú en tu Cocina
          </h1>
          <p className="text-body-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Especias, sales de Maras, aceites de oliva virgen extra y productos gourmet
            peruanos seleccionados con amor. Llevamos la despensa andina y costeña a tu mesa.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/tienda">
                Explorar Productos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/recetas">
                Ver Recetas
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <Feature
            icon={Truck}
            title="Envío Gratis + S/150"
            description="A todo el Perú con Shalom"
          />
          <Feature
            icon={Shield}
            title="Pago Seguro"
            description="Mercado Pago, Yape, Plin, Transferencia"
          />
          <Feature
            icon={RotateCcw}
            title="Devoluciones Fáciles"
            description="30 días para cambios"
          />
          <Feature
            icon={Sparkles}
            title="Calidad Garantizada"
            description="Productos 100% peruanos"
          />
        </div>
      </div>

      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
      </div>
    </section>
  );
}

function Feature({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return (
    <div className="p-4">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-body-sm text-muted-foreground">{description}</p>
    </div>
  );
}