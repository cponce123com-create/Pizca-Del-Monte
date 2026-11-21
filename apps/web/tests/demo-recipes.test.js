import { demoRecipes } from '../src/lib/demo-recipes';
import { demoProducts } from '../src/lib/demo-products';

test('las recetas destacadas contienen preparación y enlazan a productos existentes', () => {
  expect(demoRecipes.map(recipe => recipe.slug)).toEqual(expect.arrayContaining(['papa-huancaina-clasica', 'lomo-saltado-tradicional', 'ceviche-clasico']));
  for (const recipe of demoRecipes) {
    expect(recipe.ingredients.length).toBeGreaterThan(2);
    expect(recipe.steps.length).toBeGreaterThan(1);
    expect(recipe.products.every(slug => demoProducts.some(product => product.slug === slug))).toBe(true);
  }
});
