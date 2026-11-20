'use client';

import { Award, Leaf, Truck, Heart } from 'lucide-react';

const badges = [
  {
    icon: Award,
    title: 'Origen Certificado',
    description: 'Productos con denominación de origen',
  },
  {
    icon: Leaf,
    title: '100% Natural',
    description: 'Sin aditivos ni conservantes artificiales',
  },
  {
    icon: Truck,
    title: 'Envío Nacional',
    description: 'Llegamos a todo el Perú con Shalom',
  },
  {
    icon: Heart,
    title: 'Hecho con Amor',
    description: 'Pequeños productores peruanos',
  },
];

export function TrustBadges() {
  return (
    <section className="py-12 border-y border-border bg-muted/30" aria-label="Garantías de calidad">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {badges.map((badge, index) => (
            <div key={index} className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <badge.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{badge.title}</h3>
                <p className="text-body-sm text-muted-foreground">{badge.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}