import Image from 'next/image';
import Link from 'next/link';
import { demoRecipes } from '@/lib/demo-recipes';

export const metadata = { title: 'Recetario peruano', description: 'Ideas y recetas para inspirarte en la cocina.' };
export default function RecipesPage() {
  return <div className="container py-12 sm:py-16">
    <p className="text-sm font-semibold uppercase tracking-widest text-primary">Pizca del Monte</p>
    <h1 className="mt-3 font-heading text-4xl font-semibold">Recetario peruano</h1>
    <p className="mt-4 max-w-2xl text-muted-foreground">Tres ideas para cocinar y descubrir nuevas combinaciones. Las imágenes son referenciales.</p>
    <div className="mt-10 grid gap-6 md:grid-cols-3">{demoRecipes.map(recipe => <article key={recipe.slug} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <Link href={`/recetas/${recipe.slug}`} className="group block"><div className="relative aspect-[4/3] bg-muted"><Image src={recipe.image} alt={`Imagen referencial de ${recipe.title}`} fill className="object-cover transition-transform group-hover:scale-105" sizes="(max-width: 768px) 100vw, 33vw" /></div>
        <div className="p-6"><p className="text-xs font-medium text-primary">{recipe.time} · {recipe.servings}</p><h2 className="mt-2 font-heading text-2xl font-semibold">{recipe.title}</h2><p className="mt-3 text-sm text-muted-foreground">{recipe.description}</p><span className="mt-5 inline-block font-medium text-primary">Ver receta →</span></div>
      </Link></article>)}</div>
  </div>;
}
