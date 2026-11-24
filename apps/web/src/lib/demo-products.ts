import { formatPEN } from '@pizca/utils';

const categories = [
  { slug: 'especias', name: 'Especias' },
  { slug: 'sales-gourmet', name: 'Sales Gourmet' },
  { slug: 'aceites-vinagres', name: 'Aceites y Vinagres' },
  { slug: 'mezclas-salsas', name: 'Mezclas y Salsas' },
  { slug: 'packs-gourmet', name: 'Packs Gourmet' },
  { slug: 'accesorios', name: 'Accesorios' },
];

const imageUrls = [
  'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1518110925495-5fe2b0ba94a9?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=900&q=85',
] as const;

type DemoItem = {
  name: string;
  slug: string;
  price: number;
  categoryIndex: number;
  description: string;
  size: string;
  imageIndex: number;
  tag?: string;
};

const items: DemoItem[] = [
  { name: 'Ají Amarillo Molido', slug: 'aji-amarillo-molido', price: 18, categoryIndex: 0, description: 'Ají amarillo peruano molido para aderezos, guisos y marinados con color y aroma casero.', size: '80 g', imageIndex: 0, tag: 'Favorito' },
  { name: 'Ají Panca Molido', slug: 'aji-panca-molido', price: 16, categoryIndex: 0, description: 'Ají panca de sabor profundo y ligeramente ahumado para cocina criolla y parrillas.', size: '80 g', imageIndex: 3 },
  { name: 'Ají Charapita', slug: 'aji-charapita', price: 35, categoryIndex: 0, description: 'Pequeños ajíes amazónicos de picor vibrante y notas frutales para salsas intensas.', size: '50 g', imageIndex: 0, tag: 'Origen amazónico' },
  { name: 'Rocoto Molido', slug: 'rocoto-molido', price: 19, categoryIndex: 0, description: 'Rocoto peruano molido con picor amable, color vivo y final frutal.', size: '80 g', imageIndex: 3 },
  { name: 'Cúrcuma Molida', slug: 'curcuma-molida', price: 15, categoryIndex: 0, description: 'Cúrcuma de tono dorado para infusiones, arroces, sopas y mezclas de cocina.', size: '100 g', imageIndex: 6 },
  { name: 'Comino Molido', slug: 'comino-molido', price: 12, categoryIndex: 0, description: 'Comino aromático molido en lote pequeño para aderezos y recetas de todos los días.', size: '60 g', imageIndex: 0 },
  { name: 'Pimienta Negra Entera', slug: 'pimienta-negra-entera', price: 22, categoryIndex: 0, description: 'Granos de pimienta negra para moler al momento y levantar cualquier plato.', size: '70 g', imageIndex: 0 },
  { name: 'Orégano Peruano', slug: 'oregano-peruano', price: 14, categoryIndex: 0, description: 'Orégano peruano secado a la sombra, intenso y fragante para pizzas y guisos.', size: '35 g', imageIndex: 6 },
  { name: 'Canela en Rama', slug: 'canela-en-rama', price: 17, categoryIndex: 0, description: 'Ramas de canela aromática para postres, bebidas calientes y cocina casera.', size: '45 g', imageIndex: 7 },
  { name: 'Anís Estrella', slug: 'anis-estrella', price: 20, categoryIndex: 0, description: 'Anís estrella de aroma dulce y especiado para infusiones y repostería.', size: '35 g', imageIndex: 7 },
  { name: 'Vainilla Amazónica', slug: 'vainilla-amazonica', price: 29, categoryIndex: 0, description: 'Vainilla peruana de perfil floral para perfumar cafés, cremas y postres.', size: '10 g', imageIndex: 8, tag: 'Nuevo' },
  { name: 'Pimienta de Moyobamba', slug: 'pimienta-de-moyobamba', price: 24, categoryIndex: 0, description: 'Pimienta amazónica de fragancia cálida y final especiado, ideal para carnes.', size: '60 g', imageIndex: 0, tag: 'Origen único' },
  { name: 'Sal de Maras - Flor de Sal', slug: 'sal-de-maras-flor-de-sal', price: 45, categoryIndex: 1, description: 'Cristales ligeros cosechados en las salineras de Cusco para terminar tus platos.', size: '150 g', imageIndex: 1, tag: 'Origen Cusco' },
  { name: 'Sal Rosada de Maras', slug: 'sal-rosada-de-maras', price: 25, categoryIndex: 1, description: 'Sal rosada de grano medio, delicada y mineral, para cocina diaria.', size: '350 g', imageIndex: 1 },
  { name: 'Sal Ahumada', slug: 'sal-ahumada', price: 23, categoryIndex: 1, description: 'Sal de Maras ahumada en frío con maderas naturales para notas profundas.', size: '180 g', imageIndex: 1 },
  { name: 'Sal con Hierbas', slug: 'sal-con-hierbas', price: 24, categoryIndex: 1, description: 'Sal marina con orégano, romero y tomillo para sazonar en un solo gesto.', size: '200 g', imageIndex: 6, tag: 'Más vendido' },
  { name: 'Sal con Ají', slug: 'sal-con-aji', price: 24, categoryIndex: 1, description: 'Cristales de sal con ají amarillo para huevos, palta, papas y piqueos.', size: '200 g', imageIndex: 3 },
  { name: 'Sal de Maras con Cacao', slug: 'sal-de-maras-con-cacao', price: 27, categoryIndex: 1, description: 'Mezcla inesperada de sal rosada y cacao tostado para postres y frutas.', size: '150 g', imageIndex: 1, tag: 'Edición especial' },
  { name: 'Sal de Maras con Romero', slug: 'sal-de-maras-con-romero', price: 24, categoryIndex: 1, description: 'Sal gourmet con romero peruano para papas, vegetales y carnes al horno.', size: '200 g', imageIndex: 6 },
  { name: 'Sal de Maras con Pimienta', slug: 'sal-de-maras-con-pimienta', price: 26, categoryIndex: 1, description: 'Sal rosada y pimienta negra molida en la proporción justa para la mesa.', size: '180 g', imageIndex: 0 },
  { name: 'Aceite de Oliva Arbequina', slug: 'aceite-oliva-arbequina', price: 89, categoryIndex: 2, description: 'Aceite extra virgen de perfil frutado y suave para ensaladas, panes y pastas.', size: '500 ml', imageIndex: 2, tag: 'Origen peruano' },
  { name: 'Aceite de Oliva Extra Virgen', slug: 'aceite-oliva-extra-virgen', price: 65, categoryIndex: 2, description: 'Aceite prensado en frío de uso diario, limpio y equilibrado.', size: '500 ml', imageIndex: 2 },
  { name: 'Aceite con Romero', slug: 'aceite-con-romero', price: 42, categoryIndex: 2, description: 'Aceite de oliva infusionado con romero para focaccias, papas y marinados.', size: '250 ml', imageIndex: 2 },
  { name: 'Aceite con Ajo', slug: 'aceite-con-ajo', price: 42, categoryIndex: 2, description: 'Aceite aromático con ajo para pastas, verduras y panes recién tostados.', size: '250 ml', imageIndex: 2 },
  { name: 'Aceite con Ají Limo', slug: 'aceite-con-aji-limo', price: 45, categoryIndex: 2, description: 'Aceite de oliva con ají limo para terminar ceviches, tiraditos y bowls.', size: '250 ml', imageIndex: 3, tag: 'Picante' },
  { name: 'Aceite de Sacha Inchi', slug: 'aceite-de-sacha-inchi', price: 58, categoryIndex: 2, description: 'Aceite amazónico prensado en frío con perfil verde y delicado.', size: '250 ml', imageIndex: 2, tag: 'Prensado en frío' },
  { name: 'Vinagre de Manzana', slug: 'vinagre-de-manzana', price: 28, categoryIndex: 2, description: 'Vinagre de manzana de acidez amable para vinagretas y bebidas caseras.', size: '500 ml', imageIndex: 2 },
  { name: 'Vinagre de Chicha de Jora', slug: 'vinagre-de-chicha-de-jora', price: 32, categoryIndex: 2, description: 'Vinagre de chicha de jora con carácter peruano para aderezos y cebollas.', size: '250 ml', imageIndex: 2, tag: 'Receta local' },
  { name: 'Aceite de Palta', slug: 'aceite-de-palta', price: 52, categoryIndex: 2, description: 'Aceite suave de palta para ensaladas, mayonesas y cocina de baja temperatura.', size: '250 ml', imageIndex: 2 },
  { name: 'Aceite de Ajonjolí', slug: 'aceite-de-ajonjoli', price: 38, categoryIndex: 2, description: 'Aceite tostado de ajonjolí para arroces, verduras y recetas de inspiración oriental.', size: '250 ml', imageIndex: 2 },
  { name: 'Mezcla para Parrilla', slug: 'mezcla-para-parrilla', price: 26, categoryIndex: 3, description: 'Combinación de ají panca, pimienta, comino y hierbas para carnes y vegetales.', size: '120 g', imageIndex: 0, tag: 'Favorito' },
  { name: 'Chimichurri Peruano', slug: 'chimichurri-peruano', price: 24, categoryIndex: 3, description: 'Hierbas, ají y especias en una mezcla fresca para acompañar tus parrillas.', size: '100 g', imageIndex: 6 },
  { name: 'Salsa de Ají Amarillo', slug: 'salsa-de-aji-amarillo', price: 22, categoryIndex: 3, description: 'Salsa cremosa de ají amarillo para sánguches, papas y platos criollos.', size: '220 g', imageIndex: 3 },
  { name: 'Salsa de Rocoto', slug: 'salsa-de-rocoto', price: 22, categoryIndex: 3, description: 'Rocoto, limón y especias en una salsa intensa para acompañar cada bocado.', size: '220 g', imageIndex: 3, tag: 'Picante' },
  { name: 'Mezcla de Hierbas Andinas', slug: 'mezcla-de-hierbas-andinas', price: 20, categoryIndex: 3, description: 'Muña, cedrón, huacatay y orégano para infusiones y cocina aromática.', size: '60 g', imageIndex: 6, tag: 'Origen andino' },
  { name: 'Aderezo de Huacatay', slug: 'aderezo-de-huacatay', price: 25, categoryIndex: 3, description: 'Huacatay y ajíes peruanos en una crema fragante para papas y pastas.', size: '220 g', imageIndex: 3 },
  { name: 'Aderezo de Culantro', slug: 'aderezo-de-culantro', price: 24, categoryIndex: 3, description: 'Culantro fresco y especias para arroces, guisos y marinados rápidos.', size: '220 g', imageIndex: 3 },
  { name: 'Pasta de Ajo', slug: 'pasta-de-ajo', price: 21, categoryIndex: 3, description: 'Ajo molido en pasta para cocinar con sabor casero sin complicaciones.', size: '220 g', imageIndex: 3 },
  { name: 'Pasta de Ají Panca', slug: 'pasta-de-aji-panca', price: 23, categoryIndex: 3, description: 'Ají panca en pasta, listo para aderezos, anticuchos y guisos.', size: '220 g', imageIndex: 3 },
  { name: 'Pasta de Rocoto', slug: 'pasta-de-rocoto', price: 23, categoryIndex: 3, description: 'Rocoto molido en pasta para darle carácter y color a tus recetas.', size: '220 g', imageIndex: 3 },
  { name: 'Mermelada de Aguaymanto', slug: 'mermelada-de-aguaymanto', price: 28, categoryIndex: 3, description: 'Aguaymanto de altura cocido lentamente para desayunos y tablas de queso.', size: '250 g', imageIndex: 8, tag: 'Cosecha local' },
  { name: 'Miel de Cacao', slug: 'miel-de-cacao', price: 30, categoryIndex: 3, description: 'Miel de flores con nibs de cacao tostado para acompañar quesos y yogur.', size: '250 g', imageIndex: 6 },
  { name: 'Molinillo de Especias', slug: 'molinillo-de-especias', price: 39, categoryIndex: 5, description: 'Molinillo manual de madera para disfrutar aromas recién molidos en la mesa.', size: '1 unidad', imageIndex: 5, tag: 'Accesorio' },
  { name: 'Frasco de Vidrio', slug: 'frasco-de-vidrio', price: 15, categoryIndex: 5, description: 'Frasco reutilizable con tapa para guardar especias, semillas y mezclas.', size: '180 ml', imageIndex: 4 },
  { name: 'Mortero de Cocina', slug: 'mortero-de-cocina', price: 55, categoryIndex: 5, description: 'Mortero de piedra para preparar aderezos, pastas y mezclas artesanales.', size: '1 unidad', imageIndex: 5, tag: 'Hecho a mano' },
  { name: 'Cuchara Medidora', slug: 'cuchara-medidora', price: 18, categoryIndex: 5, description: 'Cuchara de madera para medir y servir especias con precisión.', size: '1 unidad', imageIndex: 5 },
  { name: 'Tabla de Maridaje', slug: 'tabla-de-maridaje', price: 49, categoryIndex: 5, description: 'Tabla compacta de madera para servir sales, quesos y piqueos.', size: '1 unidad', imageIndex: 5, tag: 'Regalo' },
  { name: 'Tazón de Cerámica', slug: 'tazon-de-ceramica', price: 35, categoryIndex: 5, description: 'Tazón artesanal de acabado mate para dips, salsas y snacks.', size: '1 unidad', imageIndex: 5 },
  { name: 'Set de Frascos', slug: 'set-de-frascos', price: 44, categoryIndex: 5, description: 'Tres frascos de vidrio para organizar tu despensa con orden y estilo.', size: '3 unidades', imageIndex: 4 },
  { name: 'Pinza para Servir', slug: 'pinza-para-servir', price: 22, categoryIndex: 5, description: 'Pinza de madera para servir sales, hierbas y pequeños acompañamientos.', size: '1 unidad', imageIndex: 5 },
  { name: 'Pack Parrilla Peruana', slug: 'pack-parrilla-peruana', price: 120, categoryIndex: 4, description: 'Ají panca, mezcla para parrilla, sal ahumada, chimichurri y salsa de rocoto.', size: '5 productos', imageIndex: 4, tag: 'Ahorra 12%' },
  { name: 'Pack Sabores del Perú', slug: 'pack-sabores-del-peru', price: 95, categoryIndex: 4, description: 'Una selección para descubrir ají amarillo, sal de Maras, cacao y hierbas andinas.', size: '4 productos', imageIndex: 4, tag: 'Más vendido' },
  { name: 'Pack Sales de Maras', slug: 'pack-sales-de-maras', price: 75, categoryIndex: 4, description: 'Flor de sal, sal rosada, sal ahumada y sal con hierbas para regalar.', size: '4 productos', imageIndex: 1, tag: 'Ahorra 10%' },
  { name: 'Pack Cocina Criolla', slug: 'pack-cocina-criolla', price: 88, categoryIndex: 4, description: 'Ajíes, comino, pasta de ajo, pasta de ají panca y huacatay para cocinar.', size: '5 productos', imageIndex: 3, tag: 'Favorito' },
  { name: 'Pack Despensa de Origen', slug: 'pack-despensa-de-origen', price: 112, categoryIndex: 4, description: 'Aceite de oliva, aceite de sacha inchi, sal de Maras y pimienta amazónica.', size: '4 productos', imageIndex: 2, tag: 'Origen peruano' },
  { name: 'Pack Aceites y Vinagres', slug: 'pack-aceites-y-vinagres', price: 132, categoryIndex: 4, description: 'Aceite extra virgen, aceite con ajo, aceite con romero y vinagre de manzana.', size: '4 productos', imageIndex: 2, tag: 'Ahorra 15%' },
  { name: 'Pack Picante Peruano', slug: 'pack-picante-peruano', price: 78, categoryIndex: 4, description: 'Ají charapita, rocoto, salsa de ají amarillo y pasta de rocoto para amantes del picor.', size: '4 productos', imageIndex: 3, tag: 'Picante' },
  { name: 'Pack Regalo Gourmet', slug: 'pack-regalo-gourmet', price: 145, categoryIndex: 4, description: 'Una caja lista para regalar con sales, aceite, especias y tabla de maridaje.', size: '5 productos', imageIndex: 4, tag: 'Edición regalo' },
  { name: 'Pack Cocina de Todos los Días', slug: 'pack-cocina-de-todos-los-dias', price: 84, categoryIndex: 4, description: 'Comino, orégano, ají amarillo, sal con hierbas y aceite con ajo para la despensa.', size: '5 productos', imageIndex: 6, tag: 'Ahorra 9%' },
  { name: 'Pack Colección Pizca del Monte', slug: 'pack-coleccion-pizca-del-monte', price: 189, categoryIndex: 4, description: 'La selección más completa de la tienda para conocer nuestros favoritos peruanos.', size: '8 productos', imageIndex: 4, tag: 'Edición especial' },
];

export const demoProducts = items.map((item, i) => {
  const category = categories[item.categoryIndex];
  const image = imageUrls[item.imageIndex % imageUrls.length];
  const media = [{ id: `demo-media-${i + 1}`, url: image, alt: `${item.name} — Pizca del Monte` }];
  return {
    id: `demo-${i + 1}`,
    sku: `DEMO-${String(i + 1).padStart(3, '0')}`,
    name: item.name,
    slug: item.slug,
    shortDescription: `${item.description} Presentación demo de ${item.size}.`,
    description: `${item.description} Presentación demo de ${item.size}. Precio e imagen referenciales para explorar la tienda.`,
    type: 'SIMPLE',
    basePrice: item.price,
    compareAtPrice: null,
    formattedPrice: formatPEN(item.price),
    formattedCompareAtPrice: null,
    discountPercent: 0,
    brand: { id: 'demo-brand', name: 'Pizca del Monte', slug: 'pizca-del-monte', logo: null },
    categories: [{ id: category.slug, ...category, isPrimary: true }],
    primaryImage: media[0],
    media,
    variants: [{
      id: `demo-variant-${i + 1}`,
      sku: `DEMO-${String(i + 1).padStart(3, '0')}`,
      name: item.size,
      price: item.price,
      formattedPrice: formatPEN(item.price),
      compareAtPrice: null,
      formattedCompareAtPrice: null,
      discountPercent: 0,
      weight: null,
      trackInventory: false,
      inStock: true,
      availableQty: 99,
      maxQty: 99,
      attributes: [],
      media,
    }],
    attributeGroups: [],
    inventory: null,
    trackInventory: false,
    inStock: true,
    availableQty: 99,
    isNew: item.tag === 'Nuevo',
    isBestseller: item.tag === 'Más vendido' || item.tag === 'Favorito',
    isFeatured: i < 8 || item.categoryIndex === 4,
    rating: 0,
    reviewCount: 0,
    reviews: [],
    weight: null,
    dimensions: null,
    metaTitle: null,
    metaDescription: item.description,
    tags: item.tag ? [item.tag] : [],
    isDemo: true,
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
    (!term || normalizeProductSearch(`${product.name} ${product.categories[0].name} ${product.sku} ${product.shortDescription}`).includes(term)) &&
    (!filters.featured || product.isFeatured) && !filters.onSale
  );
  if (term && filters.sort === 'newest') result = result.sort((a, b) => Number(normalizeProductSearch(b.name).startsWith(term)) - Number(normalizeProductSearch(a.name).startsWith(term)));
  if (filters.sort === 'price_asc') result = result.sort((a, b) => a.basePrice - b.basePrice);
  if (filters.sort === 'price_desc') result = result.sort((a, b) => b.basePrice - a.basePrice);
  if (filters.sort === 'name_asc') result = result.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  if (filters.sort === 'name_desc') result = result.sort((a, b) => b.name.localeCompare(a.name, 'es'));
  const total = result.length, totalPages = Math.ceil(total / filters.limit);
  return { isDemo: true, products: result.slice((filters.page - 1) * filters.limit, filters.page * filters.limit), pagination: { page: filters.page, limit: filters.limit, total, totalPages, hasNext: filters.page < totalPages, hasPrev: filters.page > 1 } };
}
