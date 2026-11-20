'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

const categories = [
  {
    name: 'Especias',
    slug: 'especias',
    description: 'Ajíes, hierbas, semillas y mezclas',
    image: '/images/categories/especias.jpg',
    count: 24,
    color: 'from-forest-600 to-forest-800',
  },
  {
    name: 'Sales Gourmet',
    slug: 'sales-gourmet',
    description: 'Maras, aromatizadas y de origen',
    image: '/images/categories/sales.jpg',
    count: 12,
    color: 'from-terracotta-500 to-terracotta-700',
  },
  {
    name: 'Aceites y Vinagres',
    slug: 'aceites-vinagres',
    description: 'AOVE, infusionados y artesanales',
    image: '/images/categories/aceites.jpg',
    count: 18,
    color: 'from-ochre-500 to-ochre-700',
  },
  {
    name: 'Mezclas y Salsas',
    slug: 'mezclas-salsas',
    description: 'Huancaína, ocopa, aderezos',
    image: '/images/categories/salsas.jpg',
    count: 15,
    color: 'from-amber-500 to-amber-700',
  },
  {
    name: 'Packs Gourmet',
    slug: 'packs-gourmet',
    description: 'Regalos curados y temáticos',
    image: '/images/categories/packs.jpg',
    count: 8,
    color: 'from-rose-500 to-rose-700',
  },
  {
    name: 'Accesorios',
    slug: 'accesorios',
    description: 'Morteros, molinillos, frascos',
    image: '/images/categories/accesorios.jpg',
    count: 10,
    color: 'from-stone-500 to-stone-700',
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
            <article key={category.slug} className="group relative aspect-square overflow-hidden rounded-xl">
              <Link href={`/tienda/categoria/${category.slug}`} className="block h-full">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />
                <div className="absolute inset-0 bg-[var(--color)]/20" style={{ '--color': category.color.split(' ')[1] }} />
                <img
                  src={category.image}
                  alt={category.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
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
          ))}
        </div>
      </div>
    </section>
  );
}