import { formatPEN } from '@pizca/utils';

export const demoCategories = [
  { slug: 'especias', name: 'Especias' },
  { slug: 'sales-gourmet', name: 'Sales Gourmet' },
  { slug: 'aceites-vinagres', name: 'Aceites y Vinagres' },
  { slug: 'mezclas-salsas', name: 'Mezclas y Salsas' },
  { slug: 'packs-gourmet', name: 'Packs Gourmet' },
  { slug: 'accesorios', name: 'Accesorios' },
];
type DemoFixture = readonly [name: string, slug: string, price: number, categoryIndex: 0 | 1 | 2 | 3 | 4 | 5];
const items: readonly DemoFixture[] = [
  ['Ají Amarillo Molido','aji-amarillo-molido',18,0], ['Ají Panca Molido','aji-panca-molido',16,0],
  ['Ají Charapita','aji-charapita',35,0], ['Rocoto Molido','rocoto-molido',19,0],
  ['Cúrcuma Molida','curcuma-molida',15,0], ['Comino Molido','comino-molido',12,0],
  ['Pimienta Negra Entera','pimienta-negra-entera',22,0], ['Orégano Peruano','oregano-peruano',14,0],
  ['Sal de Maras - Flor de Sal','sal-de-maras-flor-de-sal',45,1], ['Sal Rosada de Maras','sal-rosada-de-maras',25,1],
  ['Sal Ahumada','sal-ahumada',23,1], ['Sal con Hierbas','sal-con-hierbas',24,1],
  ['Sal con Ají','sal-con-aji',24,1], ['Aceite de Oliva Arbequina','aceite-oliva-arbequina',89,2],
  ['Aceite de Oliva Extra Virgen','aceite-oliva-extra-virgen',65,2], ['Aceite con Romero','aceite-con-romero',42,2],
  ['Aceite con Ajo','aceite-con-ajo',42,2], ['Vinagre de Manzana','vinagre-de-manzana',28,2],
  ['Mezcla para Parrilla','mezcla-para-parrilla',26,3], ['Chimichurri Peruano','chimichurri-peruano',24,3],
  ['Salsa de Ají Amarillo','salsa-de-aji-amarillo',22,3], ['Salsa de Rocoto','salsa-de-rocoto',22,3],
  ['Mezcla de Hierbas Andinas','mezcla-de-hierbas-andinas',20,3], ['Pack Parrilla Peruana','pack-parrilla-peruana',120,4],
  ['Pack Sabores del Perú','pack-sabores-del-peru',95,4], ['Pack Sales de Maras','pack-sales-de-maras',75,4],
  ['Pack Cocina Criolla','pack-cocina-criolla',88,4], ['Molinillo de Especias','molinillo-de-especias',39,5],
  ['Frasco de Vidrio','frasco-de-vidrio',15,5], ['Mortero de Cocina','mortero-de-cocina',55,5],
];

const descriptions: readonly string[] = [
  "Ají amarillo molido para dar color y sabor a tus preparaciones.",
  "Ají panca molido para aderezos y guisos.",
  "Ají charapita para explorar sabores de la Amazonía.",
  "Rocoto molido para dar intensidad a tus platos.",
  "Cúrcuma molida para arroces y mezclas de especias.",
  "Comino molido para sazonar guisos y aderezos.",
  "Pimienta negra entera para moler al momento.",
  "Orégano para salsas, marinados y preparaciones caseras.",
  "Flor de sal de presentación referencial para terminar tus platos.",
  "Sal rosada referencial para acompañar tu cocina.",
  "Sal ahumada para aportar un toque aromático.",
  "Sal mezclada con hierbas para sazonar.",
  "Sal con ají para quienes disfrutan sabores intensos.",
  "Aceite estilo arbequina para aderezos y ensaladas.",
  "Aceite de oliva de presentación referencial para cocinar.",
  "Aceite con notas de romero para acompañar platos.",
  "Aceite con notas de ajo para preparaciones saladas.",
  "Vinagre de manzana para ensaladas y aderezos.",
  "Mezcla de especias para preparaciones a la parrilla.",
  "Mezcla tipo chimichurri para carnes y verduras.",
  "Salsa referencial de ají amarillo para acompañar comidas.",
  "Salsa referencial de rocoto para dar un toque picante.",
  "Mezcla de hierbas inspirada en sabores andinos.",
  "Selección de productos referenciales para la parrilla.",
  "Selección de sabores peruanos para explorar.",
  "Selección de sales referenciales para la cocina.",
  "Selección de ingredientes para la cocina criolla.",
  "Molinillo referencial para especias enteras.",
  "Frasco referencial para guardar ingredientes secos.",
  "Mortero referencial para preparar mezclas de especias."
];

export const demoProducts = items.map(([name, slug, price, index], i) => {
  const category = demoCategories[index];
  const image = { id: `demo-image-${i + 1}`, url: `/demo/${category.slug}.webp`, alt: `Ilustración referencial de ${name}`, type: 'IMAGE', sortOrder: 0 };
  const weight = index === 0 ? 0.05 : index === 1 ? 0.25 : index === 2 ? 0.5 : index === 3 ? 0.2 : null;
  const presentation = weight ? `${weight * 1000} ${index === 2 ? 'ml' : 'g'} (referencial)` : 'Unidad referencial';
  return {
    id: `demo-${i + 1}`, sku: `DEMO-${String(i + 1).padStart(3, '0')}`, name, slug,
    shortDescription: descriptions[i],
    description: `${descriptions[i]} Presentación, precio y disponibilidad de demostración.`,
    presentation, origin: 'Origen por confirmar',
    type: 'SIMPLE', basePrice: price, compareAtPrice: null, formattedPrice: formatPEN(price),
    formattedCompareAtPrice: null, discountPercent: 0, brand: { id: 'demo-brand', name: 'Pizca del Monte', slug: 'pizca-del-monte', logo: null },
    categories: [{ id: category.slug, ...category, isPrimary: true }], primaryImage: { url: image.url, alt: image.alt },
    media: [image], variants: [{ id: `demo-variant-${i + 1}`, sku: `DEMO-${String(i + 1).padStart(3, '0')}`, name: 'Presentación referencial', price, formattedPrice: formatPEN(price), compareAtPrice: null, formattedCompareAtPrice: null, discountPercent: 0, weight, trackInventory: false, inStock: true, availableQty: 99, maxQty: 99, attributes: [], media: [image] }],
    attributeGroups: [], inventory: null, trackInventory: false, inStock: true, availableQty: 99,
    isNew: false, isBestseller: false, isFeatured: i < 8, rating: 0, reviewCount: 0, reviews: [],
    weight, dimensions: null, metaTitle: null, metaDescription: null, tags: [], isDemo: true,
  };
});

type Filters = { page: number; limit: number; sort: string; category?: string; brand?: string; minPrice?: number; maxPrice?: number; search?: string; inStock?: boolean; featured?: boolean; onSale?: boolean };
export function listDemoProducts(filters: Filters) {
  let result = demoProducts.filter(product =>
    (!filters.category || product.categories.some(category => category.slug === filters.category)) &&
    (!filters.brand || product.brand.slug === filters.brand) &&
    (filters.minPrice === undefined || product.basePrice >= filters.minPrice) &&
    (filters.maxPrice === undefined || product.basePrice <= filters.maxPrice) &&
    (!filters.search || `${product.name} ${product.description} ${product.sku}`.toLocaleLowerCase('es').includes(filters.search.toLocaleLowerCase('es'))) &&
    (!filters.featured || product.isFeatured) && !filters.onSale
  );
  if (filters.sort === 'popular') result = result.sort((a,b) => Number(b.isFeatured) - Number(a.isFeatured) || a.name.localeCompare(b.name, 'es'));
  if (filters.sort === 'price_asc') result = result.sort((a,b) => a.basePrice - b.basePrice);
  if (filters.sort === 'price_desc') result = result.sort((a,b) => b.basePrice - a.basePrice);
  if (filters.sort === 'name_asc') result = result.sort((a,b) => a.name.localeCompare(b.name, 'es'));
  if (filters.sort === 'name_desc') result = result.sort((a,b) => b.name.localeCompare(a.name, 'es'));
  const total = result.length, totalPages = Math.ceil(total / filters.limit);
  return { isDemo: true, products: result.slice((filters.page - 1) * filters.limit, filters.page * filters.limit), pagination: { page: filters.page, limit: filters.limit, total, totalPages, hasNext: filters.page < totalPages, hasPrev: filters.page > 1 } };
}
