import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { demoRecipes } from '@/lib/demo-recipes';
import { demoProducts } from '@/lib/demo-products';

export function FeaturedRecipes() {
  return (
    <section className="bg-muted/30 py-16" aria-labelledby="recipes-heading">
      <div className="container">
        <div className="mb-9 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="recipes-heading" className="font-heading text-3xl font-semibold">Recetario peruano</h2>
            <p className="mt-2 text-muted-foreground">Ideas paso a paso con ingredientes que puedes explorar en la tienda.</p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/recetas">Ver todas las recetas <ChevronRight className="h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {demoRecipes.slice(0, 3).map(recipe => (
            <Card key={recipe.slug} className="group overflow-hidden">
              <Link href={'/recetas/' + recipe.slug} className="block h-full">
                <div className="relative aspect-video overflow-hidden bg-muted">
                  <Image unoptimized src={recipe.image} alt={'Imagen referencial de ' + recipe.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" />
                </div>
                <CardContent className="space-y-3 p-4">
                  <p className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {recipe.time}</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {recipe.servings}</span>
                  </p>
                  <h3 className="font-semibold group-hover:text-primary">{recipe.title}</h3>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {recipe.products.slice(0, 3).map(slug => demoProducts.find(product => product.slug === slug)?.name).filter(Boolean).join(' · ')}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">Ver receta completa <ChevronRight className="h-4 w-4" /></span>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
