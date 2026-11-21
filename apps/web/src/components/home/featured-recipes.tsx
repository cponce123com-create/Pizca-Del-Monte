'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ChevronRight, Clock, Users, Utensils, Flame, BookOpen } from 'lucide-react';

const recipes = [
  {
    id: '1',
    title: 'Papa a la Huancaína Clásica',
    slug: 'papa-huancaina-clasica',
    description: 'El plato bandera de la cocina limeña, cremoso y picante con ají amarillo y queso fresco.',
    image: '/images/recipes/huancaina.jpg',
    difficulty: 'FÁCIL',
    time: 35,
    servings: 4,
    tags: ['vegetariano', 'sin gluten', 'clásico'],
    products: ['Ají Amarillo', 'Aceite de Oliva', 'Sal de Maras'],
  },
  {
    id: '2',
    title: 'Lomo Saltado Tradicional',
    slug: 'lomo-saltado-tradicional',
    description: 'El mestizaje perfecto: wok chino, ingredientes peruanos. Tiras de lomo salteadas con cebolla y tomate.',
    image: '/images/recipes/lomo-saltado.jpg',
    difficulty: 'MEDIO',
    time: 30,
    servings: 4,
    tags: ['fusión', 'chino-peruano', 'carne'],
    products: ['Ají Amarillo', 'Aceite de Oliva', 'Vinagre de Manzana', 'Sal de Maras'],
  },
  {
    id: '3',
    title: 'Ceviche Clásico Peruano',
    slug: 'ceviche-clasico',
    description: 'Pescado fresco "cocido" en limón, el orgullo de la costa. Con camote, choclo y cancha.',
    image: '/images/recipes/ceviche.jpg',
    difficulty: 'FÁCIL',
    time: 35,
    servings: 4,
    tags: ['pescado', 'crudo', 'patrimonio', 'sin cocción'],
    products: ['Sal de Maras'],
  },
];

export function FeaturedRecipes() {
  return (
    <section className="py-20 bg-muted/30" aria-labelledby="recipes-heading">
      <div className="container">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 id="recipes-heading" className="text-display-md font-heading font-medium">
              Recetario Peruano
            </h2>
            <p className="text-muted-foreground mt-2">
              Aprende a cocinar con nuestros ingredientes. Paso a paso, tips y productos recomendados.
            </p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/recetas">
              Ver todas las recetas
              <ChevronRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RecipeCard({ recipe }: { recipe: typeof recipes[0] }) {
  const [imageError, setImageError] = useState(false);

  return (
    <Card className="group overflow-hidden h-full flex flex-col">
      <Link href={`/recetas/${recipe.slug}`} className="block relative aspect-video overflow-hidden">
        {!imageError ? (
          <Image
            src={recipe.image}
            alt={recipe.title}
            fill
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <Badge variant="primary">{recipe.difficulty}</Badge>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex gap-2">
          {recipe.products.slice(0, 3).map((product, index) => (
            <Badge key={index} variant="outline" className="bg-background/90 backdrop-blur">
              {product}
            </Badge>
          ))}
        </div>
      </Link>
      <CardContent className="flex-1 p-4 pb-0 flex flex-col">
        <div className="flex items-center gap-4 text-body-xs text-muted-foreground mb-2">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {recipe.time} min
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {recipe.servings} porc.
          </span>
        </div>
        <Link href={`/recetas/${recipe.slug}`}>
          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {recipe.title}
          </h3>
        </Link>
        <p className="text-body-sm text-muted-foreground mt-1 line-clamp-2 flex-1">
          {recipe.description}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {recipe.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button variant="ghost" size="sm" className="w-full" asChild>
          <Link href={`/recetas/${recipe.slug}`}>
            Ver receta completa
            <ChevronRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}