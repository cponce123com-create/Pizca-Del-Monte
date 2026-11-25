'use client';

import { useState } from 'react';
import { Plus, Search, ChevronDown, ChevronUp, Trash2, Edit, ToggleLeft, ToggleRight, Calculator } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type TaxConfig = {
  id: string;
  name: string;
  type: string;
  rate: string;
  isActive: boolean;
  appliesTo: string[];
  exemptions: string[];
  startDate: string;
  endDate: string | null;
  sunatCode: string | null;
};

export default function ImpuestosPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string; status?: string; type?: string }> }) {
  const [taxConfigs, setTaxConfigs] = useState<TaxConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'type', direction: 'asc' });

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || '';
  const status = params.status || '';
  const type = params.type || '';

  const fetchTaxConfigs = async () => {
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

      const res = await fetch(`/api/admin/impuestos?${searchParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTaxConfigs(data.taxConfigs);
        setPagination({ page: data.page, totalPages: data.totalPages, total: data.total });
      }
    } catch (error) {
      console.error('Error fetching tax configs:', error);
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

  const formatTaxType = (type: string) => {
    const types: Record<string, string> = {
      IGV: 'IGV (Impuesto General a las Ventas)',
      ISC: 'ISC (Impuesto Selectivo al Consumo)',
      PERCEPCION: 'Percepción',
      RETENCION: 'Retención',
      DETRACCION: 'Detracción',
    };
    return types[type] || type;
  };

  const formatRate = (rate: string) => {
    const num = parseFloat(rate);
    return `${num.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="h-8 w-8" />
            Configuración de Impuestos (SUNAT)
          </h1>
          <p className="text-muted-foreground">Gestiona tipos de impuestos, tasas y configuración SUNAT</p>
        </div>
        <Link href="/admin/impuestos/nuevo" className="btn btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Impuesto
        </Link>
      </div>

      {/* Info Card */}
      <Card className="border-info/50 bg-info/5">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">18%</p>
              <p className="text-sm text-muted-foreground">IGV Estándar</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{taxConfigs.filter(t => t.type === 'IGV' && t.isActive).length}</p>
              <p className="text-sm text-muted-foreground">Configuraciones IGV</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{taxConfigs.filter(t => t.isActive).length}</p>
              <p className="text-sm text-muted-foreground">Impuestos Activos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{taxConfigs.filter(t => t.endDate && new Date(t.endDate) < new Date()).length}</p>
              <p className="text-sm text-muted-foreground">Expirados</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-4 bg-card p-4 rounded-lg border">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, código SUNAT..."
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
            <SelectItem value="IGV">IGV</SelectItem>
            <SelectItem value="ISC">ISC</SelectItem>
            <SelectItem value="PERCEPCION">Percepción</SelectItem>
            <SelectItem value="RETENCION">Retención</SelectItem>
            <SelectItem value="DETRACCION">Detracción</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-2">Nombre <getSortIcon key="name" /></div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('type')}>
                <div className="flex items-center gap-2">Tipo <getSortIcon key="type" /></div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('rate')}>
                <div className="flex items-center gap-2">Tasa <getSortIcon key="rate" /></div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('startDate')}>
                <div className="flex items-center gap-2">Vigencia <getSortIcon key="startDate" /></div>
              </TableHead>
              <TableHead>Ámbito</TableHead>
              <TableHead>Exenciones</TableHead>
              <TableHead>Código SUNAT</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
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
            ) : taxConfigs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No se encontraron configuraciones de impuestos
                </TableCell>
              </TableRow>
            ) : (
              taxConfigs.map((tax) => (
                <TableRow key={tax.id}>
                  <TableCell className="font-medium">{tax.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatTaxType(tax.type)}</Badge>
                  </TableCell>
                  <TableCell className="font-mono font-semibold">{formatRate(tax.rate)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{format(new Date(tax.startDate), 'dd/MM/yyyy', { locale: es })}</p>
                      {tax.endDate && (
                        <p className="text-muted-foreground">
                          hasta {format(new Date(tax.endDate), 'dd/MM/yyyy', { locale: es })}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {tax.appliesTo.length > 0 ? (
                      <Badge variant="secondary" className="mr-1">{tax.appliesTo.length} categor{'í' + 'a'}</Badge>
                    ) : (
                      <span className="text-muted-foreground">Todos</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {tax.exemptions.length > 0 ? (
                      <Badge variant="outline" className="mr-1">{tax.exemptions.length} RUCs</Badge>
                    ) : (
                      <span className="text-muted-foreground">Ninguna</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono">
                    {tax.sunatCode || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tax.isActive ? 'default' : 'secondary'}>
                      {tax.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                    {tax.endDate && new Date(tax.endDate) < new Date() && tax.isActive && (
                      <Badge variant="destructive" className="mt-1">Expirado</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/impuestos/${tax.id}`} className="btn btn-ghost btn-sm" title="Editar">
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        className="btn btn-ghost btn-sm"
                        title={tax.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {tax.isActive ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                      </button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" title="Eliminar">
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
            Mostrando {((page - 1) * 20) + 1} a {Math.min(page * 20, pagination.total)} de {pagination.total} configuraciones
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1}
              onClick={() => { const p = new URLSearchParams(window.location.search); p.set('page', (page - 1).toString()); window.location.search = p.toString(); }}
            >Anterior</Button>
            <Button variant="outline" size="sm" disabled={page === pagination.totalPages}
              onClick={() => { const p = new URLSearchParams(window.location.search); p.set('page', (page + 1).toString()); window.location.search = p.toString(); }}
            >Siguiente</Button>
          </div>
        </div>
      )}
    </div>
  );
}