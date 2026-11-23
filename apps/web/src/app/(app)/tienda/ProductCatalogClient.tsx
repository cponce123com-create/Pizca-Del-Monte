'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { addDemoCartItem } from '@/lib/demo-cart';
import { useToast } from '@/hooks/use-toast';

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
  variants: any[];
  inStock: boolean;
  availableQty: number;
  trackInventory: boolean;
  isNew: boolean;
  isBestseller: boolean;
  isDemo?: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ProductsResponse {
  products: Product[];
  pagination: Pagination;
}

interface ProductCatalogClientProps {
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

export function ProductCatalogClient({ initialParams }: ProductCatalogClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    sort: initialParams.sort || 'newest',
    category: initialParams.category || '',
    brand: initialParams.brand || '',
    minPrice: initialParams.minPrice || '',
    maxPrice: initialParams.maxPrice || '',
    search: initialParams.search || '',
    inStock: initialParams.inStock === 'true',
    featured: initialParams.featured === 'true',
    onSale: initialParams.onSale === 'true',
  });

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== false) {
          params.set(key, String(value));
        }
      });
      params.set('page', String(searchParams.get('page') || '1'));

      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error('Error al cargar productos');

      const data: ProductsResponse = await response.json();
      setProducts(data.products);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    if (value !== '' && value !== false) {
      params.set(key, String(value));
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`/tienda?${params.toString()}`);
  };

  const clearFilters = () => {
    const clearedFilters = {
      sort: 'newest',
      category: '',
      brand: '',
      minPrice: '',
      maxPrice: '',
      search: '',
      inStock: false,
      featured: false,
      onSale: false,
    };
    setFilters(clearedFilters);
    router.push('/tienda');
  };

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
          <Button variant="outline" size="icon" onClick={() => setShowFilters(true)}>
            <Filter className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar de filtros */}
        <aside className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-white border-r lg:static lg:relative lg:z-auto lg:inset-0 lg:w-64',
          showFilters ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}>
          <div className="flex flex-col h-full">
            {/* Header del sidebar */}
            <div className="flex items-center justify-between p-4 border-b lg:hidden">
              <h2 className="text-heading-sm font-heading font-semibold">Filtros</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Búsqueda */}
              <div>
                <label className="block text-body-sm font-medium mb-2">Buscar productos</label>
                <Input
                  placeholder="Especias, sales, aceites..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
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
                    <SelectItem value="especias">Especias</SelectItem>
                    <SelectItem value="sales-gourmet">Sales Gourmet</SelectItem>
                    <SelectItem value="aceites-vinagres">Aceites y Vinagres</SelectItem>

                    <SelectItem value="mezclas-salsas">Mezclas y Salsas</SelectItem>
                    <SelectItem value="packs-gourmet">Packs Gourmet</SelectItem>
                    <SelectItem value="accesorios">Accesorios</SelectItem>
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
                    <SelectItem value="pizca-del-monte">Pizca del Monte</SelectItem>
                    <SelectItem value="marcas-de-casa">Marcas de Casa</SelectItem>
                    <SelectItem value="artesanos">Artesanos Peruanos</SelectItem>
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
  const { toast } = useToast();
  const router = useRouter();

  const handleAddToCart = () => {
    if (!product.inStock) return;
    if (product.isDemo) {
      addDemoCartItem(product.slug, 1);
      toast({ title: 'Agregado al carrito de prueba', description: product.name });
      return;
    }
    // En modo real la selección de variantes se realiza en la ficha.
    router.push('/producto/' + product.slug);
  };

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg">
      <Link href={'/producto/' + product.slug} className="block flex-1">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <DemoProductImage
            name={product.name}
            category={product.categories.map(category => category.name).join(' ')}
            src={product.primaryImage?.url}
            alt={product.primaryImage?.alt}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {product.discountPercent > 0 && <Badge variant="destructive" className="absolute left-2 top-2">-{product.discountPercent}%</Badge>}
          {!product.inStock && <span className="absolute inset-0 flex items-center justify-center bg-black/50"><Badge variant="destructive">Agotado</Badge></span>}
        </div>
        <CardContent className="space-y-2 p-4">
          {product.brand && <p className="text-xs uppercase tracking-wide text-muted-foreground">{product.brand.name}</p>}
          <h3 className="font-medium group-hover:text-primary">{product.name}</h3>
          {product.shortDescription && <p className="line-clamp-2 text-sm text-muted-foreground">{product.shortDescription}</p>}
          <div className="flex flex-wrap items-baseline gap-2 pt-2">
            <span className="font-heading text-lg font-semibold">{product.formattedPrice}</span>
            {product.discountPercent > 0 && product.formattedCompareAtPrice && <span className="text-sm text-muted-foreground line-through">{product.formattedCompareAtPrice}</span>}
            {product.isDemo && <span className="text-xs text-muted-foreground">Referencial</span>}
          </div>
        </CardContent>
      </Link>
      <CardFooter className="px-4 pb-4 pt-0">
        <Button className="w-full" disabled={!product.inStock} onClick={handleAddToCart}
          aria-label={product.isDemo ? 'Agregar ' + product.name + ' al carrito de prueba' : 'Elegir presentación de ' + product.name}>
          <ShoppingBag className="mr-2 h-4 w-4" />
          {!product.inStock ? 'Agotado' : product.isDemo ? 'Agregar al carrito' : 'Elegir presentación'}
        </Button>
      </CardFooter>
    </Card>
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