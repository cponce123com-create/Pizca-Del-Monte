'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, Leaf, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const heroImage = 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1400&q=88';

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-ivory-100" aria-labelledby="hero-heading">
      <div className="container relative py-10 sm:py-14 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
          <div className="relative z-10 max-w-2xl">
            <Badge variant="primary" className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.18em]">
              <Sparkles className="h-3.5 w-3.5" />
              Colección de origen peruano
            </Badge>
            <h1 id="hero-heading" className="max-w-xl font-heading text-5xl font-medium leading-[0.98] tracking-[-0.04em] text-forest-950 sm:text-6xl lg:text-7xl">
              El sabor del Perú, <span className="text-primary">en tu ritual.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-foreground-muted sm:text-lg">
              Especias, sales de Maras, aceites y packs gourmet seleccionados para cocinar con más origen, más intención y mucho más sabor.
            </p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Button size="lg" className="rounded-full px-6 shadow-lg shadow-primary/15" asChild>
                <Link href="/tienda">
                  Explorar catálogo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="rounded-full px-5 text-primary hover:bg-primary/10" asChild>
                <Link href="/packs">Ver packs para regalar</Link>
              </Button>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-5 gap-y-3 text-xs text-foreground-muted">
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Precios referenciales en soles</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> 50 productos + 10 packs</span>
            </div>
          </div>

          <div className="relative min-h-[390px] overflow-hidden rounded-[2rem] bg-primary shadow-2xl shadow-primary/15 sm:min-h-[500px] lg:min-h-[575px]">
            <Image
              unoptimized
              src={heroImage}
              alt="Especias peruanas, sales y hierbas sobre una mesa de madera"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 55vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-950/65 via-transparent to-forest-950/5" />
            <div className="absolute left-5 top-5 rounded-full bg-background/90 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary shadow-lg sm:left-7 sm:top-7">
              De la tierra a tu mesa
            </div>
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 sm:bottom-7 sm:left-7 sm:right-7">
              <div className="max-w-xs text-white">
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-ivory-200"><Leaf className="h-3.5 w-3.5" /> Pizca del Monte</div>
                <p className="font-heading text-2xl leading-tight sm:text-3xl">Pequeñas maravillas, gran origen.</p>
              </div>
              <Link href="/tienda" className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ivory-100 text-primary transition-transform hover:scale-105 sm:flex" aria-label="Ir a la tienda">
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-terracotta-200/35 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 top-8 h-72 w-72 rounded-full bg-ochre-200/35 blur-3xl" aria-hidden="true" />
    </section>
  );
}
