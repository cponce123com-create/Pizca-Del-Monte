'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ChevronRight, Tag, Package, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const products = [
  {
    id: '1',
    name: 'Ají Amarillo Molido',
    slug: 'aji-amarillo-molido',
    description: 'El alma de la cocina criolla: causa, huancaína, ají de gallina',
    price: 18.00,
    compareAtPrice: 22.00,
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=900&q=85',
    brand: 'Pizca del Monte',
    category: 'Especias',
    inStock: true,
    isNew: true,
  },
  {
    id: '2',
    name: 'Sal de Maras - Flor de Sal',
    slug: 'sal-de-maras-flor-de-sal',
    description: 'Cosechada a mano en las milenarias salineras de Maras, Cusco',
    price: 45.00,
    compareAtPrice: 55.00,
    image: 'https://images.unsplash.com/photo-1518110925495-5fe2b0ba94a9?w=900&q=85',
    brand: 'Maras',
    category: 'Sales Gourmet',
    inStock: true,
    isBestseller: true,
  },
  {
    id: '3',
    name: 'Aceite de Oliva Virgen Extra - Arbequina',
    slug: 'aceite-oliva-arbequina',
    description: 'Cosecha temprana en Ica, notas a manzana verde y almendra',
    price: 89.00,
    compareAtPrice: 110.00,
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=900&q=85',
    brand: 'Oliva del Sur',
    category: 'Aceites',
    inStock: true,
  },
  {
    id: '4',
    name: 'Pack Parrilla Peruana',
    slug: 'pack-parrilla-peruana',
    description: 'Sales, ajíes, aceite y chimichurri en caja de madera grabada',
    price: 289.00,
    compareAtPrice: 349.00,
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=900&q=85',
    brand: 'Pizca del Monte',
    category: 'Packs Gourmet',
    inStock: true,
    isNew: true,
    isBundle: true,
  },
];

export function FeaturedProducts() {
  return (
    <section className="py-20 bg-background" aria-labelledby="products-heading">
      <div className="container">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 id="products-heading" className="text-display-md font-heading font-medium">
              Productos Destacados
            </h2>
            <p className="text-muted-foreground mt-2">
              Nuestra selección de los más vendidos y novedades
            </p>
          </div>
          <Button variant="ghost" asChild>
            <Link href="/tienda?featured=true">
              Ver catálogo completo
              <ChevronRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: typeof products[0] }) {
  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast({
      title: 'Redirigiendo al producto',
      description: 'Selecciona la variante y cantidad en la página del producto',
      variant: 'default'
    });
    setTimeout(() => {
      router.push(`/tienda/${product.slug}`);
    }, 500);
  };

  return (
    <Card className="group overflow-hidden h-full flex flex-col">
      <Link href={`/tienda/${product.slug}`} className="block relative aspect-square overflow-hidden">
        {!imageError ? (
          <Image
            unoptimized
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isNew && (
            <Badge variant="primary">Nuevo</Badge>
          )}
          {product.isBestseller && (
            <Badge variant="secondary">Más vendido</Badge>
          )}
          {product.isBundle && (
            <Badge variant="accent">
              <Package className="h-3 w-3 mr-1" />
              Pack
            </Badge>
          )}
          {discount > 0 && (
            <Badge variant="destructive">-{discount}%</Badge>
          )}
        </div>
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="primary"
            className="rounded-full shadow-lg"
            onClick={handleQuickAdd}
            aria-label={`Ver ${product.name} en la tienda`}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Link>
      <CardContent className="flex-1 p-4 pb-0 flex flex-col">
        <div className="flex items-center gap-2 text-body-xs text-muted-foreground mb-2">
          <Tag className="h-3 w-3" />
          <span>{product.brand}</span>
          <span>·</span>
          <span>{product.category}</span>
        </div>
        <Link href={`/tienda/${product.slug}`}>
          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        <p className="text-body-sm text-muted-foreground mt-1 line-clamp-2 flex-1">
          {product.description}
        </p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <div className="flex items-baseline gap-2">
          <span className="text-heading-sm font-semibold text-foreground">
            S/ {product.price.toFixed(2)}
          </span>
          {product.compareAtPrice && (
            <span className="text-body-sm text-muted-foreground line-through">
              S/ {product.compareAtPrice.toFixed(2)}
            </span>
          )}
        </div>
        {!product.inStock && (
          <Badge variant="destructive" className="mt-2 w-full text-center">
            Agotado
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}