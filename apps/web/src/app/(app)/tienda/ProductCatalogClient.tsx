'use client';
import { logger } from '@/lib/logger';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Filter, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ShoppingBag, Tag, Truck, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DemoProductImage } from '@/components/products/demo-product-image';
import { formatPEN } from '@pizca/utils';
import { useToast } from '@/hooks/use-toast';
import { demoCategories, demoProducts } from '@/lib/demo-products';

interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  type: string;
  basePrice: number;
  compareAtPrice: number | null;
  formattedPrice: string;
  formattedCompareAtPrice: string | null;
  discountPercent: number;
  brand: { id: string; name: string; slug: string } | null;
  categories: { id: string; name: string; slug: string; isPrimary: boolean }[];
  primaryImage: { url: string; alt: string } | null;
  variants: unknown[];
  inStock: boolean;
  availableQty: number;
  trackInventory: boolean;
  isNew: boolean;
  isBestseller: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ProductsResponse {
  products: Product[];
  pagination: Pagination;
}

interface ProductCatalogClientProps {
  initialData?: ProductsResponse;
  initialParams: {
    page?: string;
    sort?: string;
    category?: string;
    brand?: string;
    minPrice?: string;
    maxPrice?: string;
    search?: string;
    inStock?: string;
    featured?: string;
    onSale?: string;
  };
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Más nuevos' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'name_asc', label: 'Nombre: A-Z' },
  { value: 'name_desc', label: 'Nombre: Z-A' },
  { value: 'popular', label: 'Más populares' },
];

const PERU_DEPARTMENTS = [
  'Amazonas', 'Ancash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca',
  'Callao', 'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín',
  'La Libertad', 'Lambayeque', 'Lima', 'Loreto', 'Madre de Dios',
  'Moquegua', 'Pasco', 'Piura', 'Puno', 'San Martín', 'Tacna',
  'Tumbes', 'Ucayali'
];

export function ProductCatalogClient({ initialParams, initialData }: ProductCatalogClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>(initialData?.products || []);
  const [pagination, setPagination] = useState<Pagination | null>(initialData?.pagination || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [showFilters, setShowFilters] = useState(false);
  const filterPanelRef = useRef<HTMLElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!showFilters) return;
    const panel = filterPanelRef.current;
    panel?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setShowFilters(false); filterButtonRef.current?.focus(); return; }
      if (event.key !== 'Tab' || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')).filter(element => element.offsetParent !== null);
      if (!focusable.length) { event.preventDefault(); panel.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showFilters]);
  const [error, setError] = useState(false);
  const requestVersion = useRef(0);
  const query = searchParams.toString();
  const filters = useMemo(() => {
    const params = new URLSearchParams(query);
    return { sort: params.get('sort') || 'newest', category: params.get('category') || '', brand: params.get('brand') || '', minPrice: params.get('minPrice') || '', maxPrice: params.get('maxPrice') || '', search: params.get('search') || '', inStock: params.get('inStock') === 'true', featured: params.get('featured') === 'true', onSale: params.get('onSale') === 'true' };
  }, [query]);
  const [searchDraft, setSearchDraft] = useState(initialParams.search || '');
  useEffect(() => { setSearchDraft(filters.search); }, [filters.search]);
  const handleFilterChange = useCallback((key: keyof typeof filters, value: string | boolean) => {
    const params = new URLSearchParams(query);
    if (value !== '' && value !== false) params.set(key, String(value)); else params.delete(key);
    params.set('page', '1');
    router.replace(`/tienda?${params.toString()}`);
  }, [query, router]);
  useEffect(() => {
    if (searchDraft === filters.search) return;
    const timer = setTimeout(() => handleFilterChange('search', searchDraft), 300);
    return () => clearTimeout(timer);
  }, [searchDraft, filters.search, handleFilterChange]);

  const fetchProducts = useCallback(async () => {
    const version = ++requestVersion.current;
    setIsLoading(true); setError(false);
    try {
      const params = new URLSearchParams(query);
      params.delete('view');
      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error('Error al cargar productos');
      const data: ProductsResponse = await response.json();
      if (version === requestVersion.current) { setProducts(data.products); setPagination(data.pagination); }
    } catch (error) {
      logger.error('Error fetching products:', error);
      if (version === requestVersion.current) setError(true);
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  }, [query]);
  useEffect(() => { fetchProducts(); return () => { requestVersion.current++; }; }, [fetchProducts]);
  const clearFilters = () => { setSearchDraft(''); router.replace('/tienda'); };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'sort') return value !== 'newest';
    return value !== '' && value !== false;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header con filtros móviles */}
      <div className="border-b bg-white sticky top-0 z-40 lg:hidden">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-heading-md font-heading font-semibold">Tienda</h1>
          <Button ref={filterButtonRef} variant="outline" size="icon" aria-label="Abrir filtros" onClick={() => setShowFilters(true)}>
            <Filter className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar de filtros */}
        <aside ref={filterPanelRef} role={showFilters ? 'dialog' : undefined} aria-modal={showFilters ? true : undefined} aria-label="Filtros de productos" tabIndex={-1} className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-white border-r lg:static lg:relative lg:z-auto lg:inset-0 lg:w-64',
          showFilters ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}>
          <div className="flex flex-col h-full">
            {/* Header del sidebar */}
            <div className="flex items-center justify-between p-4 border-b lg:hidden">
              <h2 className="text-heading-sm font-heading font-semibold">Filtros</h2>
              <Button variant="ghost" size="icon" aria-label="Cerrar filtros" onClick={() => { setShowFilters(false); filterButtonRef.current?.focus(); }}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Búsqueda */}
              <div>
                <label className="block text-body-sm font-medium mb-2">Buscar productos</label>
                <Input
                  placeholder="Especias, sales, aceites..."
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  className="mb-2"
                />
              </div>

              {/* Ordenar */}
              <div>
                <label className="block text-body-sm font-medium mb-2">Ordenar por</label>
                <Select value={filters.sort} onValueChange={(v) => handleFilterChange('sort', v)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rango de precios */}
              <div>
                <label className="block text-body-sm font-medium mb-2">Rango de precio</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Mín"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    className="w-24"
                    min="0"
                    step="0.1"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    placeholder="Máx"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    className="w-24"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>

              {/* Categorías */}
              <div>
                <label className="block text-body-sm font-medium mb-2">Categoría</label>
                <Select value={filters.category || 'all'} onValueChange={(v) => handleFilterChange('category', v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {demoCategories.map(category => <SelectItem key={category.slug} value={category.slug}>{category.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Marcas */}
              <div>
                <label className="block text-body-sm font-medium mb-2">Marca</label>
                <Select value={filters.brand || 'all'} onValueChange={(v) => handleFilterChange('brand', v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Todas las marcas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las marcas</SelectItem>
                    {Array.from(new Map(demoProducts.map(product => [product.brand.slug, product.brand])).values()).map(brand => <SelectItem key={brand.slug} value={brand.slug}>{brand.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3 border-t pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.inStock}
                    onCheckedChange={(checked) => handleFilterChange('inStock', checked)}
                  />
                  <span className="text-body-sm">Solo en stock</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.featured}
                    onCheckedChange={(checked) => handleFilterChange('featured', checked)}
                  />
                  <span className="text-body-sm">Destacados</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.onSale}
                    onCheckedChange={(checked) => handleFilterChange('onSale', checked)}
                  />
                  <span className="text-body-sm">En oferta</span>
                </label>
              </div>

              {hasActiveFilters && (
                <Button variant="outline" className="w-full" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>
        </aside>

        {/* Overlay para móvil */}
        {showFilters && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setShowFilters(false)}
          />
        )}

        {/* Contenido principal */}
        <main className="flex-1 lg:pl-0">
          {/* Toolbar superior */}
          <div className="hidden lg:flex items-center justify-between p-4 border-b bg-white sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <h1 className="text-heading-lg font-heading font-semibold">Tienda</h1>
              {hasActiveFilters && (
                <Badge variant="secondary" className="gap-1">
                  <Tag className="h-3 w-3" />
                  Filtros activos
                  <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={clearFilters}>
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Select value={filters.sort} onValueChange={(v) => handleFilterChange('sort', v)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grid de productos */}
          <div className="p-4 lg:p-6">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div role="alert" className="py-16 text-center"><h2 className="font-semibold">No pudimos cargar los productos</h2><p className="my-4 text-muted-foreground">Inténtalo nuevamente.</p><Button variant="outline" onClick={fetchProducts}>Reintentar</Button></div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-heading-md font-heading font-medium mb-2">No se encontraron productos</h2>
                <p className="text-muted-foreground mb-6">Intenta ajustar tus filtros o búsqueda</p>
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Paginación */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.hasPrev}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('page', String(pagination.page - 1));
                        router.push(`/tienda?${params.toString()}`);
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-body-sm text-muted-foreground">
                      Página {pagination.page} de {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pagination.hasNext}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('page', String(pagination.page + 1));
                        router.push(`/tienda?${params.toString()}`);
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// Componentes auxiliares
function ProductCard({ product }: { product: Product }) {
  const hasDiscount = product.discountPercent > 0;
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!product.inStock || isAdding) return;

    setIsAdding(true);
    try {
      toast({
        title: 'Redirigiendo al producto',
        description: 'Selecciona la variante y cantidad en la página del producto',
        variant: 'default'
      });
      setTimeout(() => {
        window.location.href = `/producto/${product.slug}`;
      }, 500);
    } catch (error) {
      logger.error('Error:', error);
      toast({ title: 'Error', description: 'No se pudo procesar la acción', variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Link href={`/producto/${product.slug}`} className="group block">
      <Card className="h-full transition-shadow hover:shadow-lg overflow-hidden">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <DemoProductImage
            key={product.id}
            name={product.name}
            category={product.categories.map(category => category.name).join(' ')}
            src={product.primaryImage?.url}
            alt={product.primaryImage?.alt}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1.5">
            {hasDiscount && (
              <Badge variant="destructive" className="text-body-xs">
                -{product.discountPercent}%
              </Badge>
            )}
            {product.isNew && (
              <Badge variant="secondary" className="text-body-xs">
                <Star className="mr-1 h-3 w-3" />
                Nuevo
              </Badge>
            )}
          </div>

          {/* Stock */}
          {!product.inStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="outline" className="text-body-sm bg-destructive/90 text-destructive-foreground border-destructive">
                Agotado
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4 space-y-2">
          {/* Marca */}
          {product.brand && (
            <p className="text-body-xs text-muted-foreground uppercase tracking-wide">
              {product.brand.name}
            </p>
          )}

          <h3 className="text-body-md font-medium line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          {product.shortDescription && (
            <p className="text-body-sm text-muted-foreground line-clamp-2">
              {product.shortDescription}
            </p>
          )}

          {/* Precio */}
          <div className="flex items-baseline gap-2 pt-2">
            <span className="text-heading-sm font-heading font-semibold">
              {product.formattedPrice}
            </span>
            {hasDiscount && product.formattedCompareAtPrice && (
              <span className="text-body-sm text-muted-foreground line-through">
                {product.formattedCompareAtPrice}
              </span>
            )}
          </div>
        </CardContent>

        <CardFooter className="p-0 px-4 pb-4">
          <Button
            className="w-full"
            disabled={!product.inStock || isAdding}
            onClick={handleAddToCart}
            aria-label={`Agregar ${product.name} al carrito`}
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            {isAdding ? 'Agregando...' : product.inStock ? 'Agregar al carrito' : 'Agotado'}
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}

function ProductCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden">
      <div className="aspect-square bg-muted animate-pulse" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-5 w-20" />
      </CardContent>
      <CardFooter className="p-0 px-4 pb-4">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}