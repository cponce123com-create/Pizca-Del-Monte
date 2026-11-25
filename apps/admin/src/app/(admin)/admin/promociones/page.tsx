'use client';

import { useState } from 'react';
import { Plus, Search, Filter, ChevronDown, ChevronUp, Trash2, Edit, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Promotion = {
  id: string;
  name: string;
  slug: string;
  type: string;
  value: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  usageCount: number;
  usageLimit: number | null;
  appliesToAll: boolean;
  requiresCoupon: boolean;
  couponCode: string | null;
  _count: { products: number };
};

export default function PromocionesPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string; status?: string; type?: string }> }) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'startDate', direction: 'desc' });

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || '';
  const status = params.status || '';
  const type = params.type || '';

  // Fetch promotions on mount
  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('page', page.toString());
      searchParams.set('limit', '20');
      if (search) searchParams.set('search', search);
      if (status) searchParams.set('status', status);
      if (type) searchParams.set('type', type);
      searchParams.set('sort', sortConfig.key);
      searchParams.set('order', sortConfig.direction);

      const res = await fetch(`/api/admin/promociones?${searchParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPromotions(data.promotions);
        setPagination({ page: data.page, totalPages: data.totalPages, total: data.total });
      }
    } catch (error) {
      console.error('Error fetching promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  // We'll use a client-side approach for now
  // In a real implementation, this would be a server component with direct DB access

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ChevronDown className="h-4 w-4 text-muted-foreground" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const formatPromotionType = (type: string) => {
    const types: Record<string, string> = {
      PERCENTAGE_OFF: '% Descuento',
      FIXED_AMOUNT_OFF: 'Monto Fijo',
      BUY_X_GET_Y: 'Compra X Lleva Y',
      FREE_SHIPPING: 'Envío Gratis',
      GIFT_WITH_PURCHASE: 'Regalo con Compra',
      VOLUME_DISCOUNT: 'Descuento por Volumen',
      TIME_LIMITED: 'Tiempo Limitado',
    };
    return types[type] || type;
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promociones</h1>
          <p className="text-muted-foreground">Gestiona promociones y ofertas especiales</p>
        </div>
        <Link href="/admin/promociones/nuevo" className="btn btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Promoción
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-card p-4 rounded-lg border">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, slug o código..."
            value={search}
            onChange={(e) => {
              const params = new URLSearchParams(window.location.search);
              params.set('search', e.target.value);
              params.set('page', '1');
              window.location.search = params.toString();
            }}
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={(value) => {
          const params = new URLSearchParams(window.location.search);
          if (value) params.set('status', value); else params.delete('status');
          params.set('page', '1');
          window.location.search = params.toString();
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="inactive">Inactivas</SelectItem>
            <SelectItem value="expired">Expiradas</SelectItem>
            <SelectItem value="scheduled">Programadas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={(value) => {
          const params = new URLSearchParams(window.location.search);
          if (value) params.set('type', value); else params.delete('type');
          params.set('page', '1');
          window.location.search = params.toString();
        }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="PERCENTAGE_OFF">% Descuento</SelectItem>
            <SelectItem value="FIXED_AMOUNT_OFF">Monto Fijo</SelectItem>
            <SelectItem value="BUY_X_GET_Y">Compra X Lleva Y</SelectItem>
            <SelectItem value="FREE_SHIPPING">Envío Gratis</SelectItem>
            <SelectItem value="GIFT_WITH_PURCHASE">Regalo con Compra</SelectItem>
            <SelectItem value="VOLUME_DISCOUNT">Descuento por Volumen</SelectItem>
            <SelectItem value="TIME_LIMITED">Tiempo Limitado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-2">
                  Nombre <getSortIcon key="name" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('type')}>
                <div className="flex items-center gap-2">
                  Tipo <getSortIcon key="type" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('value')}>
                <div className="flex items-center gap-2">
                  Valor <getSortIcon key="value" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('startDate')}>
                <div className="flex items-center gap-2">
                  Vigencia <getSortIcon key="startDate" />
                </div>
              </TableHead>
              <TableHead>Ámbito</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('usageCount')}>
                <div className="flex items-center gap-2">
                  Usos <getSortIcon key="usageCount" />
                </div>
              </TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Cargando...
                  </div>
                </TableCell>
              </TableRow>
            ) : promotions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No se encontraron promociones
                </TableCell>
              </TableRow>
            ) : (
              promotions.map((promo) => (
                <TableRow key={promo.id}>
                  <TableCell>
                    <Link href={`/admin/promociones/${promo.id}`} className="font-medium hover:underline">
                      {promo.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{promo.slug}</p>
                    {promo.requiresCoupon && promo.couponCode && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        Cupón: {promo.couponCode}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatPromotionType(promo.type)}</Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {promo.type === 'PERCENTAGE_OFF' || promo.type === 'VOLUME_DISCOUNT'
                      ? `${promo.value}%`
                      : promo.type === 'FREE_SHIPPING'
                        ? 'Envío Gratis'
                        : formatCurrency(promo.value)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{format(new Date(promo.startDate), 'dd/MM/yyyy', { locale: es })}</p>
                      {promo.endDate && (
                        <p className="text-muted-foreground">
                          hasta {format(new Date(promo.endDate), 'dd/MM/yyyy', { locale: es })}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {promo.appliesToAll ? (
                      <Badge variant="secondary">Todos los productos</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {promo._count.products} producto{promo._count.products !== 1 ? 's' : ''}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono">
                    {promo.usageCount} / {promo.usageLimit || '∞'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={promo.isActive ? 'default' : 'secondary'}>
                      {promo.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                    {promo.endDate && new Date(promo.endDate) < new Date() && promo.isActive && (
                      <Badge variant="destructive" className="mt-1">Expirada</Badge>
                    )}
                    {promo.startDate && new Date(promo.startDate) > new Date() && promo.isActive && (
                      <Badge variant="outline" className="mt-1">Programada</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/promociones/${promo.id}`} className="btn btn-ghost btn-sm" title="Editar">
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm(`¿${promo.isActive ? 'Desactivar' : 'Activar'} esta promoción?`)) {
                            // Toggle status
                          }
                        }}
                        className="btn btn-ghost btn-sm"
                        title={promo.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {promo.isActive ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar esta promoción? Esta acción no se puede deshacer.')) {
                            // Delete promotion
                          }
                        }}
                        className="btn btn-ghost btn-sm text-destructive hover:text-destructive"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((page - 1) * 20) + 1} a {Math.min(page * 20, pagination.total)} de {pagination.total} promociones
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set('page', (page - 1).toString());
                window.location.search = params.toString();
              }}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === pagination.totalPages}
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set('page', (page + 1).toString());
                window.location.search = params.toString();
              }}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}