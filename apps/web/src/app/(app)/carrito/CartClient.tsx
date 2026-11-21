'use client';
import { logger } from '@/lib/logger';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingBag, Trash2, Heart, Plus, Minus, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPEN } from '@pizca/utils';
import { useToast } from '@/hooks/use-toast';

interface CartItem {
  id: string;
  variantId: string;
  sku: string;
  name: string;
  productSlug: string;
  quantity: number;
  unitPrice: number;
  formattedUnitPrice: string;
  compareAtPrice: number | null;
  formattedCompareAtPrice: string | null;
  subtotal: number;
  formattedSubtotal: string;
  discountPercent: number;
  weight: number | null;
  inStock: boolean;
  availableQty: number;
  maxQty: number;
  image: { url: string; alt: string } | null;
  brand: { name: string; slug: string } | null;
  attributes: { name: string; value: string; displayValue: string; color: string | null }[];
}

interface CartResponse {
  id: string;
  items: CartItem[];
  subtotal: number;
  formattedSubtotal: string;
  itemCount: number;
  itemTypes: number;
  expiresAt: string | null;
}

export function CartClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [cartId, setCartId] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (cartId) headers['x-cart-id'] = cartId;

      const response = await fetch('/api/cart', { headers });
      if (!response.ok) throw new Error('Error al cargar carrito');

      const data: CartResponse = await response.json();
      setCart(data);

      // Guardar cart ID para próximas requests
      const newCartId = response.headers.get('x-cart-id');
      if (newCartId) setCartId(newCartId);
    } catch (error) {
      logger.error('Error fetching cart:', error);
    } finally {
      setIsLoading(false);
    }
  }, [cartId]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    setUpdatingItems(prev => new Set(prev).add(itemId));
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (cartId) headers['x-cart-id'] = cartId;

      const response = await fetch('/api/cart', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ itemId, quantity: newQuantity }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar');
      }

      const newCartId = response.headers.get('x-cart-id');
      if (newCartId) setCartId(newCartId);

      await fetchCart();
    } catch (error) {
      logger.error('Error updating cart:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Error al actualizar cantidad', variant: 'destructive' });
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const removeItem = async (itemId: string) => {
    if (!confirm('¿Eliminar este producto del carrito?')) return;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (cartId) headers['x-cart-id'] = cartId;

      const response = await fetch('/api/cart', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ itemId }),
      });

      if (!response.ok) throw new Error('Error al eliminar');

      const newCartId = response.headers.get('x-cart-id');
      if (newCartId) setCartId(newCartId);

      await fetchCart();
    } catch (error) {
      logger.error('Error removing item:', error);
      toast({ title: 'Error', description: 'Error al eliminar producto', variant: 'destructive' });
    }
  };

  const clearCart = async () => {
    if (!confirm('¿Vaciar todo el carrito?')) return;

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (cartId) headers['x-cart-id'] = cartId;

      const response = await fetch('/api/cart', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error('Error al vaciar carrito');

      const newCartId = response.headers.get('x-cart-id');
      if (newCartId) setCartId(newCartId);

      await fetchCart();
    } catch (error) {
      logger.error('Error clearing cart:', error);
      toast({ title: 'Error', description: 'Error al vaciar carrito', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <CartItemSkeleton key={i} />
            ))}
            <CartSummarySkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-16">
        <div className="text-center px-4">
          <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground/50 mb-6" />
          <h1 className="text-display-sm font-heading font-medium mb-2">Tu carrito está vacío</h1>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Parece que aún no has agregado productos. Explora nuestra tienda y encuentra tus favoritos.
          </p>
          <Link href="/tienda">
            <Button size="lg" className="gap-2">
              <ShoppingBag className="h-5 w-5" />
              Ir a la tienda
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-display-md font-heading font-semibold">Carrito de compras</h1>
          {cart.itemTypes > 1 && (
            <Button variant="ghost" size="sm" onClick={clearCart}>
              <Trash2 className="mr-2 h-4 w-4" />
              Vaciar carrito
            </Button>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Items del carrito */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <CartItemCard
                key={item.id}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={removeItem}
                isUpdating={updatingItems.has(item.id)}
              />
            ))}
          </div>

          {/* Resumen del carrito */}
          <div className="lg:col-span-1">
            <CartSummary
              formattedSubtotal={cart.formattedSubtotal}
              itemCount={cart.itemCount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CartItemCard({
  item,
  onUpdateQuantity,
  onRemove,
  isUpdating,
}: {
  item: CartItem;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  isUpdating: boolean;
}) {
  const hasDiscount = item.discountPercent > 0;
  const maxQty = Math.min(item.maxQty, 99);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Imagen */}
          <Link href={`/producto/${item.productSlug}`} className="flex-shrink-0">
            <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {item.image ? (
                <Image
                  src={item.image.url}
                  alt={item.image.alt}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground/50" />
                </div>
              )}
              {!item.inStock && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-body-xs text-white bg-destructive/90 px-2 py-1 rounded">Agotado</span>
                </div>
              )}
            </div>
          </Link>

          {/* Info del producto */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {item.brand && (
                  <Link href={`/marca/${item.brand.slug}`} className="text-body-xs text-muted-foreground hover:text-foreground transition-colors block mb-1">
                    {item.brand.name}
                  </Link>
                )}

                <Link href={`/producto/${item.productSlug}`} className="block group">
                  <h3 className="text-body-md font-medium line-clamp-2 group-hover:text-primary transition-colors">
                    {item.name}
                  </h3>
                </Link>

                {/* Atributos */}
                {item.attributes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {item.attributes.map((attr, i) => (
                      <Badge key={i} variant="outline" className="text-body-xs gap-1">
                        {attr.color && (
                          <span className="inline-block w-4 h-4 rounded-full" style={{ backgroundColor: attr.color }} />
                        )}
                        {attr.displayValue || attr.value}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Stock warning */}
                {!item.inStock && (
                  <p className="text-body-sm text-destructive mt-2 flex items-center gap-1">
                    <X className="h-3.5 w-3.5" />
                    No hay stock disponible
                  </p>
                )}
              </div>

              {/* Precio y cantidad */}
              <div className="flex flex-col items-end gap-3 flex-shrink-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-heading-sm font-heading font-semibold">
                    {item.formattedUnitPrice}
                  </span>
                  {hasDiscount && item.formattedCompareAtPrice && (
                    <span className="text-body-sm text-muted-foreground line-through">
                      {item.formattedCompareAtPrice}
                    </span>
                  )}
                </div>

                <div className="flex items-center border rounded-lg overflow-hidden">
                  <button
                    className="p-2 hover:bg-muted transition-colors disabled:opacity-50"
                    onClick={() => !isUpdating && onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    disabled={isUpdating || item.quantity <= 1 || !item.inStock}
                    aria-label="Disminuir cantidad"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(maxQty, parseInt(e.target.value) || 1));
                      if (!isUpdating && val !== item.quantity) {
                        onUpdateQuantity(item.id, val);
                      }
                    }}
                    className="w-14 text-center border-none focus:ring-0 bg-transparent"
                    min="1"
                    max={maxQty}
                    disabled={isUpdating || !item.inStock}
                  />
                  <button
                    className="p-2 hover:bg-muted transition-colors disabled:opacity-50"
                    onClick={() => !isUpdating && onUpdateQuantity(item.id, Math.min(maxQty, item.quantity + 1))}
                    disabled={isUpdating || item.quantity >= maxQty || !item.inStock}
                    aria-label="Aumentar cantidad"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>

                <div className="text-right">
                  <p className="text-heading-sm font-heading font-semibold">
                    {item.formattedSubtotal}
                  </p>
                  {hasDiscount && (
                    <p className="text-body-xs text-success">
                      Ahorras {formatPEN((item.compareAtPrice! - item.unitPrice) * item.quantity)}
                    </p>
                  )}
                </div>

                <button
                  className="text-body-sm text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                  onClick={() => onRemove(item.id)}
                  disabled={isUpdating}
                  aria-label={`Eliminar ${item.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CartSummary({ formattedSubtotal, itemCount }: { formattedSubtotal: string; itemCount: number }) {
  return (
    <div className="sticky top-24">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-heading-md">Resumen del carrito</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-body-md">
            <span>Productos ({itemCount} art.)</span>
            <span className="font-medium">{formattedSubtotal}</span>
          </div>
          <Separator />
          <p className="text-body-sm text-muted-foreground">
            Estamos preparando las compras en línea. El pago y las tarifas de envío aún no están disponibles.
          </p>
          <Button className="w-full" size="lg" asChild>
            <Link href="/tienda">Seguir explorando</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CartItemSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Skeleton className="w-24 h-24 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CartSummarySkeleton() {
  return (
    <Card className="sticky top-24">
      <CardContent className="space-y-4 p-6">
        <Skeleton className="h-6 w-3/4" />
        <div className="space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
        <Skeleton className="h-1 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-24" />
        </div>
        <Skeleton className="h-12 w-full" />
      </CardContent>
    </Card>
  );
}