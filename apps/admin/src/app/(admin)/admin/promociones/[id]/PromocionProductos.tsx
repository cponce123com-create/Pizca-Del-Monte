'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Trash2, Package, Tag, Box, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { formatPEN } from '@pizca/utils';

interface PromocionProductosProps {
  promocion: {
    id: string;
    products: Array<{
      id: string;
      productId: string | null;
      variantId: string | null;
      categoryId: string | null;
      collectionId: string | null;
      product: { id: string; name: string; slug: string; basePrice: any; media: Array<{ url: string }> } | null;
      variant: { id: string; name: string; sku: string; price: any } | null;
      category: { id: string; name: string; slug: string } | null;
      collection: { id: string; name: string; slug: string } | null;
    }>;
  };
  adminId: string;
}

const productLinkSchema = z.object({
  type: z.enum(['product', 'variant', 'category', 'collection']),
  productId: z.string().cuid().optional().nullable(),
  variantId: z.string().cuid().optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
  collectionId: z.string().cuid().optional().nullable(),
});

type ProductLinkFormData = z.infer<typeof productLinkSchema>;

export default function PromocionProductos({ promocion, adminId }: PromocionProductosProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<'product' | 'variant' | 'category' | 'collection'>('product');
  const [saving, setSaving] = useState(false);

  const form = useForm<ProductLinkFormData>({
    resolver: zodResolver(productLinkSchema),
    defaultValues: { type: 'product' },
  });

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      let endpoint = '';
      switch (selectedType) {
        case 'product':
          endpoint = `/api/admin/productos/search?q=${encodeURIComponent(query)}&limit=10`;
          break;
        case 'variant':
          endpoint = `/api/admin/variantes/search?q=${encodeURIComponent(query)}&limit=10`;
          break;
        case 'category':
          endpoint = `/api/admin/categorias/search?q=${encodeURIComponent(query)}&limit=10`;
          break;
        case 'collection':
          endpoint = `/api/admin/colecciones/search?q=${encodeURIComponent(query)}&limit=10`;
          break;
      }
      const res = await fetch(endpoint);
      if (res.ok) setSearchResults(await res.json());
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAdd = async (data: ProductLinkFormData) => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('promotionId', promocion.id);
      if (data.productId) formData.append('productId', data.productId);
      if (data.variantId) formData.append('variantId', data.variantId);
      if (data.categoryId) formData.append('categoryId', data.categoryId);
      if (data.collectionId) formData.append('collectionId', data.collectionId);

      const res = await fetch('/admin/promociones/add-product', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        window.location.reload();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al vincular');
      }
    } catch (error) {
      alert('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (linkId: string) => {
    if (!confirm('¿Desvincular este elemento?')) return;
    try {
      const res = await fetch(`/admin/promociones/remove-product/${linkId}`, {
        method: 'POST',
        body: new URLSearchParams({ promotionId: promocion.id }),
      });
      if (res.ok) window.location.reload();
      else alert('Error al desvincular');
    } catch (error) {
      alert('Error de conexión');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'product': return <Package className="h-4 w-4" />;
      case 'variant': return <Tag className="h-4 w-4" />;
      case 'category': return <FolderOpen className="h-4 w-4" />;
      case 'collection': return <Box className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels = { product: 'Producto', variant: 'Variante', category: 'Categoría', collection: 'Colección' };
    return labels[type as keyof typeof labels] || type;
  };

  if (promocion.promocion.appliesToAll) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Productos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Esta promoción aplica a todos los productos</p>
            <p className="text-sm">No es necesario vincular productos individuales</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Productos Vinculados ({promocion.products.length})
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Vincular
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Vincular Elemento a la Promoción</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-4">
              <div>
                <label className="label">Tipo de Elemento</label>
                <Select
                  value={form.watch('type')}
                  onValueChange={(v) => {
                    form.setValue('type', v as any);
                    setSelectedType(v as any);
                    form.setValue('productId', null);
                    form.setValue('variantId', null);
                    form.setValue('categoryId', null);
                    form.setValue('collectionId', null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Producto</SelectItem>
                    <SelectItem value="variant">Variante</SelectItem>
                    <SelectItem value="category">Categoría</SelectItem>
                    <SelectItem value="collection">Colección</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="label">Buscar {getTypeLabel(form.watch('type'))}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Buscar ${getTypeLabel(form.watch('type')).toLowerCase()}...`}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      handleSearch(e.target.value);
                    }}
                    className="pl-10"
                    disabled={searchLoading}
                  />
                </div>
                {searchLoading && <p className="text-sm text-muted-foreground">Buscando...</p>}
                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-60 overflow-y-auto border rounded bg-popover">
                    {searchResults.map((item: any) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          form.setValue(`${form.watch('type')}Id`, item.id);
                          setSearchQuery(item.name || item.sku || item.slug);
                          setSearchResults([]);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-2"
                      >
                        {item.media?.[0] && <img src={item.media[0].url} alt="" className="h-8 w-8 rounded object-cover" />}
                        <div>
                          <p className="font-medium text-sm">{item.name || item.sku || item.slug}</p>
                          {item.price && <p className="text-xs text-muted-foreground">{formatPEN(Number(item.price))}</p>}
                          {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving || !form.watch(`${form.watch('type')}Id`)}>
                  {saving ? 'Vinculando...' : 'Vincular'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {promocion.products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No hay productos vinculados</p>
            <p className="text-sm">Haz clic en "Vincular" para agregar productos, variantes, categorías o colecciones</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Elemento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promocion.products.map((link) => {
                  let item: any = null;
                  let type: string = '';
                  if (link.product) { item = link.product; type = 'product'; }
                  else if (link.variant) { item = link.variant; type = 'variant'; }
                  else if (link.category) { item = link.category; type = 'category'; }
                  else if (link.collection) { item = link.collection; type = 'collection'; }

                  return (
                    <TableRow key={link.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {item?.media?.[0] && (
                            <img src={item.media[0].url} alt="" className="h-10 w-10 rounded object-cover" />
                          )}
                          <div>
                            <p className="font-medium">{item?.name || item?.slug || 'N/A'}</p>
                            {type === 'variant' && item?.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                            {type === 'product' && item?.slug && <p className="text-xs text-muted-foreground">/{item.slug}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {getTypeIcon(type)}
                          {getTypeLabel(type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {type === 'variant' && item?.price ? formatPEN(Number(item.price)) :
                         type === 'product' && item?.basePrice ? formatPEN(Number(item.basePrice)) : '—'}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleRemove(link.id)}
                          className="btn btn-ghost btn-sm text-destructive hover:text-destructive"
                          title="Desvincular"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}