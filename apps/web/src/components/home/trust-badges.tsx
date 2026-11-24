import { Award, Leaf, Truck, Heart, Sparkles } from 'lucide-react';

const badges = [
  { icon: Award, eyebrow: 'Selección', title: 'Sabores con historia', description: 'Ingredientes que conectan con el territorio peruano.' },
  { icon: Leaf, eyebrow: 'Origen', title: 'Despensa consciente', description: 'Ideas para cocinar mejor, sin complicar el ritual.' },
  { icon: Truck, eyebrow: 'Cobertura', title: 'Envíos por confirmar', description: 'Revisamos la cobertura antes de cada compra.' },
  { icon: Heart, eyebrow: 'Cuidado', title: 'Hecho con cariño', description: 'Una marca cercana, curiosa y de cocina real.' },
];

export function TrustBadges() {
  return (
    <section className="border-y border-border bg-ivory-50 py-8 sm:py-10" aria-label="Nuestra propuesta">
      <div className="container">
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><Sparkles className="h-3.5 w-3.5" /> Lo que nos mueve</div>
        <div className="grid gap-0 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {badges.map(({ icon: Icon, eyebrow, title, description }) => (
            <div key={title} className="flex gap-4 py-5 first:pt-0 sm:px-6 sm:py-2 first:sm:pl-0 last:pb-0 sm:last:pr-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p><h3 className="mt-1 font-semibold text-foreground">{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
