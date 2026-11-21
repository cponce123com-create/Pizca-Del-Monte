import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { demoRecipes } from '@/lib/demo-recipes';
import { demoProducts } from '@/lib/demo-products';
import { isDemoMode } from '@/lib/demo-mode';

export function generateStaticParams() { return demoRecipes.map(recipe => ({ slug: recipe.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recipe = demoRecipes.find(item => item.slug === slug);
  return { title: recipe?.title || 'Receta', description: recipe?.description };
}
export default async function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recipe = demoRecipes.find(item => item.slug === slug);
  if (!recipe) notFound();
  const products = demoProducts.filter(product => (recipe.products as readonly string[]).includes(product.slug));
  return <article className="container max-w-5xl py-10 sm:py-16">
    <nav className="mb-6 text-sm text-muted-foreground"><Link className="underline" href="/recetas">Recetario</Link> / {recipe.title}</nav>
    <div className="grid gap-8 md:grid-cols-2 md:items-center"><div><p className="text-sm font-medium text-primary">{recipe.time} · {recipe.servings}</p><h1 className="mt-3 font-heading text-4xl font-semibold">{recipe.title}</h1><p className="mt-4 text-muted-foreground">{recipe.description}</p><p className="mt-4 text-xs text-muted-foreground">Imagen referencial.</p></div><div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted"><Image src={recipe.image} alt={`Imagen referencial de ${recipe.title}`} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" /></div></div>
    <div className="mt-10 grid gap-8 md:grid-cols-[1fr_2fr]"><section className="rounded-2xl bg-muted/50 p-6"><h2 className="font-heading text-2xl font-semibold">Ingredientes</h2><ul className="mt-4 list-disc space-y-2 pl-5">{recipe.ingredients.map(item => <li key={item}>{item}</li>)}</ul></section><section><h2 className="font-heading text-2xl font-semibold">Preparación</h2><ol className="mt-4 list-decimal space-y-4 pl-5">{recipe.steps.map(step => <li key={step} className="pl-2 leading-7">{step}</li>)}</ol><p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-950"><strong>Consejo:</strong> {recipe.tip}</p></section></div>
    {isDemoMode() && <section className="mt-12 border-t pt-8"><h2 className="font-heading text-2xl font-semibold">Ingredientes para explorar</h2><p className="mt-2 text-sm text-muted-foreground">Productos referenciales del catálogo de demostración.</p><div className="mt-4 flex flex-wrap gap-3">{products.map(product => <Link key={product.slug} className="rounded-full border px-4 py-2 text-sm hover:bg-muted" href={`/producto/${product.slug}`}>{product.name}</Link>)}</div></section>}
    <Link href="/recetas" className="mt-10 inline-block underline">← Volver al recetario</Link>
  </article>;
}
