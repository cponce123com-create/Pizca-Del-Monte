import { formatPEN } from '@pizca/utils';

const categories = [
  { slug: 'especias', name: 'Especias' },
  { slug: 'sales-gourmet', name: 'Sales Gourmet' },
  { slug: 'aceites-vinagres', name: 'Aceites y Vinagres' },
  { slug: 'mezclas-salsas', name: 'Mezclas y Salsas' },
  { slug: 'packs-gourmet', name: 'Packs Gourmet' },
  { slug: 'accesorios', name: 'Accesorios' },
];
const items: [string, string, number, number][] = [
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

export const demoProducts = items.map(([name, slug, price, index], i) => {
  const category = categories[index];
  return {
    id: `demo-${i + 1}`, sku: `DEMO-${String(i + 1).padStart(3, '0')}`, name, slug,
    shortDescription: `Una propuesta referencial de ${category.name.toLowerCase()} para tu cocina.`,
    description: `${name}: producto de demostración para explorar la tienda. Su presentación, precio y disponibilidad son referenciales.`,
    type: 'SIMPLE', basePrice: price, compareAtPrice: null, formattedPrice: formatPEN(price),
    formattedCompareAtPrice: null, discountPercent: 0, brand: { id: 'demo-brand', name: 'Pizca del Monte', slug: 'pizca-del-monte', logo: null },
    categories: [{ id: category.slug, ...category, isPrimary: true }], primaryImage: null,
    media: [], variants: [{ id: `demo-variant-${i + 1}`, sku: `DEMO-${String(i + 1).padStart(3, '0')}`, name: 'Presentación referencial', price, formattedPrice: formatPEN(price), compareAtPrice: null, formattedCompareAtPrice: null, discountPercent: 0, weight: null, trackInventory: false, inStock: true, availableQty: 99, maxQty: 99, attributes: [], media: [] }],
    attributeGroups: [], inventory: null, trackInventory: false, inStock: true, availableQty: 99,
    isNew: false, isBestseller: false, isFeatured: i < 8, rating: 0, reviewCount: 0, reviews: [],
    weight: null, dimensions: null, metaTitle: null, metaDescription: null, tags: [], isDemo: true,
  };
});

export function normalizeProductSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
}

type Filters = { page: number; limit: number; sort: string; category?: string; brand?: string; minPrice?: number; maxPrice?: number; search?: string; inStock?: boolean; featured?: boolean; onSale?: boolean };
export function listDemoProducts(filters: Filters) {
  const term = filters.search ? normalizeProductSearch(filters.search) : '';
  let result = demoProducts.filter(product =>
    (!filters.category || product.categories.some(category => category.slug === filters.category)) &&
    (!filters.brand || product.brand.slug === filters.brand) &&
    (filters.minPrice === undefined || product.basePrice >= filters.minPrice) &&
    (filters.maxPrice === undefined || product.basePrice <= filters.maxPrice) &&
    (!term || normalizeProductSearch(`${product.name} ${product.categories[0].name} ${product.sku}`).includes(term)) &&
    (!filters.featured || product.isFeatured) && !filters.onSale
  );
  if (term && filters.sort === 'newest') result = result.sort((a, b) => Number(normalizeProductSearch(b.name).startsWith(term)) - Number(normalizeProductSearch(a.name).startsWith(term)));
  if (filters.sort === 'price_asc') result = result.sort((a,b) => a.basePrice - b.basePrice);
  if (filters.sort === 'price_desc') result = result.sort((a,b) => b.basePrice - a.basePrice);
  if (filters.sort === 'name_asc') result = result.sort((a,b) => a.name.localeCompare(b.name, 'es'));
  if (filters.sort === 'name_desc') result = result.sort((a,b) => b.name.localeCompare(a.name, 'es'));
  const total = result.length, totalPages = Math.ceil(total / filters.limit);
  return { isDemo: true, products: result.slice((filters.page - 1) * filters.limit, filters.page * filters.limit), pagination: { page: filters.page, limit: filters.limit, total, totalPages, hasNext: filters.page < totalPages, hasPrev: filters.page > 1 } };
}
