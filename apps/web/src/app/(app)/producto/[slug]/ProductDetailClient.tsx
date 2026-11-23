'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ShoppingBag, Heart, Share2, Truck, RotateCcw, Star, Minus, Plus, ChevronLeft, ChevronRight, X, MapPin, Clock, Package, Maximize } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DemoProductImage } from '@/components/products/demo-product-image';
import { formatPEN } from '@pizca/utils';
import { useToast } from '@/hooks/use-toast';
import { addDemoCartItem } from '@/lib/demo-cart';

interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  price: number;
  formattedPrice: string;
  compareAtPrice: number | null;
  formattedCompareAtPrice: string | null;
  discountPercent: number;
  weight: number | null;
  trackInventory: boolean;
  inStock: boolean;
  availableQty: number;
  maxQty: number;
  attributes: { attributeId: string; attributeName: string; attributeSlug: string; valueId: string; value: string; displayValue: string; color: string | null }[];
  media: { id: string; url: string; alt: string; type: string; sortOrder: number }[];
}

interface AttributeGroup {
  slug: string;
  name: string;
  values: { value: string; displayValue: string; color: string | null; variantIds: string[] }[];
}

interface Product {
  isDemo?: boolean;
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
  weight: number | null;
  dimensions: any;
  brand: { id: string; name: string; slug: string; logo: string | null } | null;
  categories: { id: string; name: string; slug: string; isPrimary: boolean }[];
  media: { id: string; url: string; alt: string; type: string; sortOrder: number }[];
  variants: ProductVariant[];
  attributeGroups: AttributeGroup[];
  inventory: { totalQty: number; reservedQty: number; availableQty: number; lowStockThreshold: number } | null;
  trackInventory: boolean;
  inStock: boolean;
  availableQty: number;
  isNew: boolean;
  isBestseller: boolean;
  isFeatured: boolean;
  rating: number;
  reviewCount: number;
  reviews: { id: string; rating: number; title: string; comment: string; createdAt: string; user: { name: string; image: string | null }; verifiedPurchase: boolean }[];
  metaTitle: string | null;
  metaDescription: string | null;
  tags: string[];
}

interface ProductDetailClientProps {
  initialProduct: Product;
}

export function ProductDetailClient({ initialProduct }: ProductDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product>(initialProduct);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Record<string, string>>({});
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showImageZoom, setShowImageZoom] = useState(false);

  // Determinar variante seleccionada basada en atributos
  useEffect(() => {
    if (product.attributeGroups.length > 0) {
      const allSelected = product.attributeGroups.every(group =>
        selectedAttributeValues[group.slug]
      );

      if (allSelected) {
        // Buscar variante que coincida con todos los atributos seleccionados
        const matchingVariant = product.variants.find(variant =>
          product.attributeGroups.every(group => {
            const selectedValue = selectedAttributeValues[group.slug];
            return variant.attributes.some(attr =>
              attr.attributeSlug === group.slug && attr.value === selectedValue
            );
          })
        );
        setSelectedVariant(matchingVariant || null);
      } else {
        setSelectedVariant(null);
      }
    } else if (product.variants.length > 0) {
      // Si no hay atributos, usar la primera variante por defecto
      setSelectedVariant(product.variants[0]);
    }
  }, [selectedAttributeValues, product]);

  // Manejar selección de atributo
  const handleAttributeSelect = (groupSlug: string, value: string) => {
    setSelectedAttributeValues(prev => ({ ...prev, [groupSlug]: value }));
  };

  // Verificar si un valor de atributo está disponible para la variante actual
  const isAttributeValueAvailable = (groupSlug: string, value: string) => {
    return product.variants.some(variant =>
      variant.inStock &&
      variant.attributes.some(attr => attr.attributeSlug === groupSlug && attr.value === value)
    );
  };

  // Agregar al carrito
  const handleAddToCart = async () => {
    if (!selectedVariant || !selectedVariant.inStock) return;

    if (product.isDemo) {
      addDemoCartItem(product.slug, quantity);
      router.push('/carrito');
      return;
    }
    setIsAddingToCart(true);
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: selectedVariant.id,
          quantity,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al agregar al carrito');
      }

      toast({ title: 'Éxito', description: 'Producto agregado al carrito', variant: 'default' });
      router.push('/carrito');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Error al agregar al carrito', variant: 'destructive' });
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleToggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('pizca-favorites') || '[]');
    const productId = product.id;
    const isFavorite = favorites.includes(productId);

    if (isFavorite) {
      const updated = favorites.filter((id: string) => id !== productId);
      localStorage.setItem('pizca-favorites', JSON.stringify(updated));
      toast({ title: 'Eliminado de favoritos', description: `${product.name} ya no está en tus favoritos`, variant: 'default' });
    } else {
      favorites.push(productId);
      localStorage.setItem('pizca-favorites', JSON.stringify(favorites));
      toast({ title: 'Agregado a favoritos', description: `${product.name} se guardó en tus favoritos`, variant: 'default' });
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: product.name,
      text: product.shortDescription || 'Mira este producto de Pizca del Monte',
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast({ title: 'Compartido', description: 'Producto compartido correctamente', variant: 'default' });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: 'Enlace copiado', description: 'El enlace del producto se copió al portapapeles', variant: 'default' });
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        toast({ title: 'Error al compartir', description: 'No se pudo compartir el producto', variant: 'destructive' });
      }
    }
  };

  const variant = selectedVariant || product;
  const hasDiscount = variant.discountPercent > 0;
  const images = variant.media.length > 0 ? variant.media : product.media;
  const currentImage = images[activeImageIndex];

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <nav className="border-b bg-white" aria-label="Breadcrumb">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <ol className="flex items-center gap-2 text-body-sm text-muted-foreground">
            <li><Link href="/" className="hover:text-foreground">Inicio</Link></li>
            <li><ChevronRight className="h-4 w-4" /></li>
            <li><Link href="/tienda" className="hover:text-foreground">Tienda</Link></li>
            <li><ChevronRight className="h-4 w-4" /></li>
            {product.categories.map((cat, i) => (
              <li key={cat.id}>
                {i < product.categories.length - 1 ? (
                  <>
                    <Link href={`/tienda/categoria/${cat.slug}`} className="hover:text-foreground">{cat.name}</Link>
                    <ChevronRight className="h-4 w-4" />
                  </>
                ) : (
                  <span className="text-foreground font-medium">{cat.name}</span>
                )}
              </li>
            ))}
            <li><ChevronRight className="h-4 w-4" /></li>
            <li><span className="text-foreground font-medium truncate max-w-[200px] block">{product.name}</span></li>
          </ol>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Galería de imágenes */}
          <div className="lg:col-span-7 space-y-4">
            {/* Imagen principal */}
            <div className="relative aspect-square bg-muted rounded-xl overflow-hidden">
              <DemoProductImage
                key={product.id + ':' + (currentImage?.url || 'demo')}
                name={product.name}
                category={product.categories.map(category => category.name).join(' ')}
                src={currentImage?.url}
                alt={currentImage?.alt}
                loading="eager"
              />

              {/* Badges en imagen */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                {hasDiscount && (
                  <Badge variant="destructive" className="text-body-sm px-2 py-1">
                    -{variant.discountPercent}%
                  </Badge>
                )}
                {product.isNew && (
                  <Badge variant="secondary" className="text-body-xs gap-1">
                    <Star className="h-3 w-3" />
                    Nuevo
                  </Badge>
                )}
                {product.isFeatured && (
                  <Badge variant="default" className="text-body-xs">
                    Destacado
                  </Badge>
                )}
              </div>

              {/* Navegación de imágenes */}
              {images.length > 1 && (
                <>
                  <button
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-colors"
                    onClick={() => setActiveImageIndex(prev => (prev - 1 + images.length) % images.length)}
                    aria-label="Imagen anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-colors"
                    onClick={() => setActiveImageIndex(prev => (prev + 1) % images.length)}
                    aria-label="Imagen siguiente"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Zoom en hover desktop */}
              <button
                className="absolute bottom-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-colors"
                onClick={() => setShowImageZoom(true)}
                aria-label="Ver imagen ampliada"
              >
                <Maximize className="h-5 w-5" />
              </button>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    className={cn(
                      'relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all',
                      activeImageIndex === index
                        ? 'border-primary'
                        : 'border-transparent hover:border-muted-foreground/50'
                    )}
                    onClick={() => setActiveImageIndex(index)}
                    aria-label={`Ver imagen ${index + 1}`}
                    aria-current={activeImageIndex === index ? 'true' : 'false'}
                  >
                    <Image
                      src={image.url}
                      alt={image.alt}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Información del producto */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 space-y-6">
              {/* Header del producto */}
              <div className="space-y-3">
                {product.brand && (
                  <Link href={`/tienda?brand=${encodeURIComponent(product.brand.slug)}`} className="text-body-sm text-muted-foreground hover:text-foreground transition-colors">
                    {product.brand.name}
                  </Link>
                )}

                <h1 className="text-display-md font-heading font-semibold">{product.name}</h1>

                <div className="flex items-center gap-4 flex-wrap">
                  {/* Rating */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-5 w-5',
                            i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-body-sm font-medium">{product.rating.toFixed(1)}</span>
                    <span className="text-body-sm text-muted-foreground">({product.reviewCount} reseñas)</span>
                  </div>
                </div>

                {/* SKU y stock */}
                <div className="flex items-center gap-4 text-body-sm text-muted-foreground flex-wrap">
                  <span>SKU: {product.sku}</span>
                  {product.trackInventory ? (
                    <span className={cn(
                      'flex items-center gap-1',
                      product.inStock ? 'text-success' : 'text-destructive'
                    )}>
                      {product.inStock ? (
                        <>
                          <Package className="h-4 w-4" />
                          {product.availableQty > 10 ? 'En stock' : `Quedan ${product.availableQty}`}
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4" />
                          Agotado
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-success">
                      <Package className="h-4 w-4" />
                      {product.isDemo ? 'Producto de demostración' : 'Disponible'}
                    </span>
                  )}
                </div>
              </div>

              {/* Precio */}
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-display-md font-heading font-semibold">
                  {variant.formattedPrice}
                </span>
                {hasDiscount && variant.formattedCompareAtPrice && (
                  <span className="text-body-lg text-muted-foreground line-through">
                    {variant.formattedCompareAtPrice}
                  </span>
                )}
              </div>

              {/* Descripción corta */}
              {product.shortDescription && (
                <p className="text-body-md text-muted-foreground">{product.shortDescription}</p>
              )}

              {/* Selector de variantes */}
              {product.attributeGroups.length > 0 && (
                <div className="space-y-4 border-t pt-4">
                  {product.attributeGroups.map((group) => (
                    <div key={group.slug}>
                      <label className="block text-body-sm font-medium mb-2">{group.name}</label>
                      <div className="flex flex-wrap gap-2">
                        {group.values.map((value) => {
                          const isSelected = selectedAttributeValues[group.slug] === value.value;
                          const isAvailable = isAttributeValueAvailable(group.slug, value.value);

                          return (
                            <button
                              key={value.value}
                              className={cn(
                                'px-4 py-2 rounded-lg border-2 text-body-sm font-medium transition-all min-w-[80px]',
                                isSelected
                                  ? 'border-primary bg-primary/5 text-primary'
                                  : isAvailable
                                  ? 'border-border hover:border-primary/50 hover:bg-accent'
                                  : 'border-border/50 bg-muted/50 text-muted-foreground/50 cursor-not-allowed line-through'
                              )}
                              onClick={() => isAvailable && handleAttributeSelect(group.slug, value.value)}
                              disabled={!isAvailable}
                              aria-pressed={isSelected}
                            >
                              {value.color && (
                                <span className="inline-block w-6 h-6 rounded-full mr-2" style={{ backgroundColor: value.color }} />
                              )}
                              {value.displayValue || value.value}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selector de cantidad */}
              <div className="border-t pt-4">
                <label className="block text-body-sm font-medium mb-2">Cantidad</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border rounded-lg overflow-hidden">
                    <button
                      className="p-3 hover:bg-muted transition-colors"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      aria-label="Disminuir cantidad"
                    >
                      <Minus className="h-5 w-5" />
                    </button>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center border-none focus:ring-0 bg-transparent"
                      min="1"
                      max={(selectedVariant?.maxQty ?? (product.trackInventory ? product.availableQty : 99))}
                      disabled={!variant.inStock}
                    />
                    <button
                      className="p-3 hover:bg-muted transition-colors"
                      onClick={() => setQuantity(Math.min((selectedVariant?.maxQty ?? (product.trackInventory ? product.availableQty : 99)), quantity + 1))}
                      disabled={quantity >= (selectedVariant?.maxQty ?? (product.trackInventory ? product.availableQty : 99))}
                      aria-label="Aumentar cantidad"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  <span className="text-body-sm text-muted-foreground">
                    Máx: {(selectedVariant?.maxQty ?? (product.trackInventory ? product.availableQty : 99))}
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col gap-3 border-t pt-4">
                <Button
                  className="w-full text-lg py-4"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={isAddingToCart || !variant.inStock}
                >
                  {isAddingToCart ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Agregando...
                    </>
                  ) : variant.inStock ? (
                    <>
                      <ShoppingBag className="mr-2 h-5 w-5" />
                      Agregar al carrito
                    </>
                  ) : (
                    'Agotado'
                  )}
                </Button>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" size="lg" onClick={handleToggleFavorite}>
                    <Heart className="mr-2 h-5 w-5" />
                    Favoritos
                  </Button>
                  <Button variant="outline" className="flex-1" size="lg" onClick={handleShare}>
                    <Share2 className="mr-2 h-5 w-5" />
                    Compartir
                  </Button>
                </div>
              </div>

              {/* Beneficios */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center gap-3 text-body-sm text-muted-foreground">
                  <Truck className="h-5 w-5 text-primary" />
                  <span>Cobertura y tarifas de envío por confirmar</span>
                </div>
                <div className="flex items-center gap-3 text-body-sm text-muted-foreground">
                  <RotateCcw className="h-5 w-5 text-primary" />
                  <span>Condiciones de cambios y devoluciones por confirmar</span>
                </div>
                <div className="flex items-center gap-3 text-body-sm text-muted-foreground">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span>Plazos de entrega por confirmar</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs de detalles */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs defaultValue="descripcion" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="descripcion">Descripción</TabsTrigger>
              <TabsTrigger value="ingredientes">Ingredientes</TabsTrigger>
              <TabsTrigger value="uso">Modo de uso</TabsTrigger>
              <TabsTrigger value="resenas">Reseñas ({product.reviewCount})</TabsTrigger>
            </TabsList>

            <TabsContent value="descripcion" className="space-y-4">
              <div className="prose prose-slate max-w-none">
                {product.description ? (
                  <div dangerouslySetInnerHTML={{ __html: product.description }} />
                ) : (
                  <p className="text-muted-foreground">No hay descripción disponible para este producto.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="ingredientes" className="space-y-4">
              <div className="prose prose-slate max-w-none">
                <p className="text-muted-foreground">Información de ingredientes y valores nutricionales próximamente.</p>
              </div>
            </TabsContent>

            <TabsContent value="uso" className="space-y-4">
              <div className="prose prose-slate max-w-none">
                <p className="text-muted-foreground">Instrucciones de uso y conservación próximamente.</p>
              </div>
            </TabsContent>

            <TabsContent value="resenas" className="space-y-4">
              {product.reviews.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-heading-md font-heading font-medium mb-2">Sin reseñas aún</h3>
                  <p className="text-muted-foreground">Sé el primero en reseñar este producto.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {product.reviews.map((review) => (
                    <Card key={review.id} className="border-border/50">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {review.user.image ? (
                              <Image src={review.user.image} alt="" className="w-10 h-10 rounded-full" />
                            ) : (
                              <span className="text-primary font-medium">
                                {review.user.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{review.user.name}</span>
                                {review.verifiedPurchase && (
                                  <Badge variant="secondary" className="text-body-xs gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Compra verificada
                                  </Badge>
                                )}
                              </div>
                              <span className="text-body-sm text-muted-foreground">
                                {new Date(review.createdAt).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </span>
                            </div>
                            <div className="flex gap-1 mt-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    'h-4 w-4',
                                    i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                                  )}
                                />
                              ))}
                            </div>
                            {review.title && (
                              <h4 className="font-medium mt-2">{review.title}</h4>
                            )}
                            <p className="mt-2 text-muted-foreground">{review.comment}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modal de zoom de imagen */}
      {showImageZoom && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setShowImageZoom(false)}>
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setShowImageZoom(false); }}
            aria-label="Cerrar zoom"
          >
            <X className="h-6 w-6" />
          </button>
          <button
            className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setActiveImageIndex(prev => (prev - 1 + images.length) % images.length); }}
            aria-label="Imagen anterior"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <Image
            src={currentImage?.url || ''}
            alt={currentImage?.alt || ''}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            priority
          />
          <button
            className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setActiveImageIndex(prev => (prev + 1) % images.length); }}
            aria-label="Imagen siguiente"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </div>
      )}
    </div>
  );
}

// Icono faltante
function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function Maximize({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}