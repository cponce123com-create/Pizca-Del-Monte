'use client';

import { useState } from 'react';
import { Plus, Search, ChevronDown, ChevronUp, Trash2, Edit, ToggleLeft, ToggleRight, Copy } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Toast, useToast } from '@/components/ui/toast';

type Coupon = {
  id: string;
  code: string;
  name: string;
  type: string;
  value: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  usageCount: number;
  usageLimit: number | null;
  perCustomerLimit: number;
  appliesToAll: boolean;
  promotionId: string | null;
  _count: { products: number };
};

export default function CuponesPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string; status?: string; type?: string }> }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'startDate', direction: 'desc' });
  const { toast } = useToast();

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || '';
  const status = params.status || '';
  const type = params.type || '';

  const fetchCoupons = async () => {
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

      const res = await fetch(`/api/admin/cupones?${searchParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons);
        setPagination({ page: data.page, totalPages: data.totalPages, total: data.total });
      }
    } catch (error) {
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const formatCouponType = (type: string) => {
    const types: Record<string, string> = {
      PERCENTAGE: '% Descuento',
      FIXED_AMOUNT: 'Monto Fijo',
      FREE_SHIPPING: 'Envío Gratis',
      BUY_X_GET_Y: 'Compra X Lleva Y',
      GIFT_PRODUCT: 'Producto Regalo',
    };
    return types[type] || type;
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(num);
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast({ title: 'Copiado', description: `Código ${code} copiado al portapapeles` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cupones</h1>
          <p className="text-muted-foreground">Gestiona códigos de descuento para clientes</p>
        </div>
        <Link href="/admin/cupones/nuevo" className="btn btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cupón
        </Link>
      </div>

      <div className="flex flex-wrap gap-4 bg-card p-4 rounded-lg border">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nombre..."
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
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
            <SelectItem value="expired">Expirados</SelectItem>
            <SelectItem value="scheduled">Programados</SelectItem>
            <SelectItem value="exhausted">Agotados</SelectItem>
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
            <SelectItem value="PERCENTAGE">% Descuento</SelectItem>
            <SelectItem value="FIXED_AMOUNT">Monto Fijo</SelectItem>
            <SelectItem value="FREE_SHIPPING">Envío Gratis</SelectItem>
            <SelectItem value="BUY_X_GET_Y">Compra X Lleva Y</SelectItem>
            <SelectItem value="GIFT_PRODUCT">Producto Regalo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort('code')}>
                <div className="flex items-center gap-2">Código <getSortIcon key="code" /></div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-2">Nombre <getSortIcon key="name" /></div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('type')}>
                <div className="flex items-center gap-2">Tipo <getSortIcon key="type" /></div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('value')}>
                <div className="flex items-center gap-2">Valor <getSortIcon key="value" /></div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('startDate')}>
                <div className="flex items-center gap-2">Vigencia <getSortIcon key="startDate" /></div>
              </TableHead>
              <TableHead>Ámbito</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('usageCount')}>
                <div className="flex items-center gap-2">Usos <getSortIcon key="usageCount" /></div>
              </TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[140px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Cargando...
                  </div>
                </TableCell>
              </TableRow>
            ) : coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No se encontraron cupones
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-medium bg-muted px-2 py-1 rounded">{coupon.code}</code>
                      <Button variant="ghost" size="icon" onClick={() => copyCode(coupon.code)} title="Copiar código">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{coupon.name}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatCouponType(coupon.type)}</Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {coupon.type === 'PERCENTAGE' ? `${coupon.value}%` :
                     coupon.type === 'FREE_SHIPPING' ? 'Envío Gratis' :
                     formatCurrency(coupon.value)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{format(new Date(coupon.startDate), 'dd/MM/yyyy', { locale: es })}</p>
                      {coupon.endDate && (
                        <p className="text-muted-foreground">
                          hasta {format(new Date(coupon.endDate), 'dd/MM/yyyy', { locale: es })}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {coupon.appliesToAll ? (
                      <Badge variant="secondary">Todos los productos</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {coupon._count.products} producto{coupon._count.products !== 1 ? 's' : ''}
                        {coupon.promotionId && <span className="ml-2 badge badge-outline">Promo</span>}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono">
                    {coupon.usageCount} / {coupon.usageLimit || '∞'} (máx {coupon.perCustomerLimit}/cliente)
                  </TableCell>
                  <TableCell>
                    <Badge variant={coupon.isActive ? 'default' : 'secondary'}>
                      {coupon.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                    {coupon.endDate && new Date(coupon.endDate) < new Date() && coupon.isActive && (
                      <Badge variant="destructive" className="mt-1">Expirado</Badge>
                    )}
                    {coupon.startDate && new Date(coupon.startDate) > new Date() && coupon.isActive && (
                      <Badge variant="outline" className="mt-1">Programado</Badge>
                    )}
                    {coupon.usageLimit && coupon.usageCount >= coupon.usageLimit && (
                      <Badge variant="destructive" className="mt-1">Agotado</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/cupones/${coupon.id}`} className="btn btn-ghost btn-sm" title="Editar">
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => {
                          // Toggle status
                        }}
                        className="btn btn-ghost btn-sm"
                        title={coupon.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {coupon.isActive ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('¿Eliminar este cupón? Esta acción no se puede deshacer.')) {
                            // Delete coupon
                          }
                        }}
                        className="text-destructive hover:text-destructive"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((page - 1) * 20) + 1} a {Math.min(page * 20, pagination.total)} de {pagination.total} cupones
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