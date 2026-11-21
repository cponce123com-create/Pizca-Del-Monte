'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ChevronRight, Package, Droplet, Leaf, Sparkles, Utensils, Wrench } from 'lucide-react';

const categories = [
  {
    name: 'Especias',
    slug: 'especias',
    description: 'Ajíes, hierbas, semillas y mezclas',
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=900&q=85',
    count: 24,
    color: 'from-forest-600 to-forest-800',
    icon: Leaf,
  },
  {
    name: 'Sales Gourmet',
    slug: 'sales-gourmet',
    description: 'Maras, aromatizadas y de origen',
    image: 'https://images.unsplash.com/photo-1518110925495-5fe2b0ba94a9?w=900&q=85',
    count: 12,
    color: 'from-terracotta-500 to-terracotta-700',
    icon: Droplet,
  },
  {
    name: 'Aceites y Vinagres',
    slug: 'aceites-vinagres',
    description: 'AOVE, infusionados y artesanales',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=900&q=85',
    count: 18,
    color: 'from-ochre-500 to-ochre-700',
    icon: Package,
  },
  {
    name: 'Mezclas y Salsas',
    slug: 'mezclas-salsas',
    description: 'Huancaína, ocopa, aderezos',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=900&q=85',
    count: 15,
    color: 'from-amber-500 to-amber-700',
    icon: Utensils,
  },
  {
    name: 'Packs Gourmet',
    slug: 'packs-gourmet',
    description: 'Regalos curados y temáticos',
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=900&q=85',
    count: 8,
    color: 'from-rose-500 to-rose-700',
    icon: Sparkles,
  },
  {
    name: 'Accesorios',
    slug: 'accesorios',
    description: 'Morteros, molinillos, frascos',
    image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=900&q=85',
    count: 10,
    color: 'from-stone-500 to-stone-700',
    icon: Wrench,
  },
];

export function FeaturedCategories() {
  return (
    <section className="py-20" aria-labelledby="categories-heading">
      <div className="container">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 id="categories-heading" className="text-display-md font-heading font-medium">
              Compra por Categoría
            </h2>
            <p className="text-muted-foreground mt-2">
              Encuentra exactamente lo que necesitas para tu cocina
            </p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/tienda?view=categories">
              Ver todas
              <ChevronRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {categories.map((category) => (
            <CategoryCard key={category.slug} category={category} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryCard({ category }: { category: typeof categories[0] }) {
  const [imageError, setImageError] = useState(false);
  const Icon = category.icon;

  return (
    <article className="group relative aspect-square overflow-hidden rounded-xl">
      <Link href={`/tienda/categoria/${category.slug}`} className="block h-full">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />
        <div className="absolute inset-0 bg-[var(--color)]/20" style={{ '--color': category.color.split(' ')[1] } as React.CSSProperties} />
        {!imageError ? (
          <Image
            unoptimized
            src={category.image}
            alt={category.name}
            fill
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 16.66vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon className="h-16 w-16 text-white/50" />
          </div>
        )}
        <div className="relative z-20 p-6 h-full flex flex-col justify-end">
          <h3 className="text-heading-md font-semibold text-white">
            {category.name}
          </h3>
          <p className="text-body-sm text-white/80 mt-1">
            {category.count} productos
          </p>
        </div>
      </Link>
    </article>
  );
}