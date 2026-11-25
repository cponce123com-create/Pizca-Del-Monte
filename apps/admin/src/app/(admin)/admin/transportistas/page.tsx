'use client';

import { useState } from 'react';
import { Plus, Truck, MapPin, Package, Settings, Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Carrier = {
  id: string;
  name: string;
  slug: string;
  code: string;
  type: string;
  isActive: boolean;
  priority: number;
  _count: { zones: number; shipments: number; rules: number };
};

type Zone = {
  id: string;
  name: string;
  carrierId: string;
  countries: string[];
  regions: string[];
  isActive: boolean;
  _count: { rates: number; rules: number };
};

type Rate = {
  id: string;
  zoneId: string;
  name: string;
  basePrice: string;
  pricePerKg: string;
  pricePerKm: string;
  estimatedDays: number;
  isActive: boolean;
  sortOrder: number;
};

type Rule = {
  id: string;
  productId: string | null;
  variantId: string | null;
  categoryId: string | null;
  carrierId: string | null;
  zoneId: string | null;
  freeShipping: boolean;
  fixedPrice: string | null;
  multiplier: string;
  minQty: number;
  maxQty: number | null;
  isActive: boolean;
  priority: number;
};

export default function TransportistasPage() {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'carriers' | 'zonas' | 'tarifas' | 'reglas'>('carriers');

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [carriersRes, zonesRes, ratesRes, rulesRes] = await Promise.all([
        fetch('/api/admin/transportistas?include=carriers'),
        fetch('/api/admin/transportistas?include=zones'),
        fetch('/api/admin/transportistas?include=rates'),
        fetch('/api/admin/transportistas?include=rules'),
      ]);
      if (carriersRes.ok) setCarriers((await carriersRes.json()).carriers);
      if (zonesRes.ok) setZones((await zonesRes.json()).zones);
      if (ratesRes.ok) setRates((await ratesRes.json()).rates);
      if (rulesRes.ok) setRules((await rulesRes.json()).rules);
    } catch (error) {
      console.error('Error fetching transport data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(num);
  };

  const formatType = (type: string) => {
    const types: Record<string, string> = {
      courier: 'Courier',
      postal: 'Postal',
      pickup: 'Recojo en Tienda',
      own: 'Propio',
    };
    return types[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transportistas y Envíos</h1>
          <p className="text-muted-foreground">Configura transportistas, zonas, tarifas y reglas de envío</p>
        </div>
        {activeTab === 'carriers' && (
          <Link href="/admin/transportistas/nuevo" className="btn btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Transportista
          </Link>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="carriers"><Truck className="h-4 w-4 mr-2" /> Transportistas</TabsTrigger>
          <TabsTrigger value="zonas"><MapPin className="h-4 w-4 mr-2" /> Zonas</TabsTrigger>
          <TabsTrigger value="tarifas"><Package className="h-4 w-4 mr-2" /> Tarifas</TabsTrigger>
          <TabsTrigger value="reglas"><Settings className="h-4 w-4 mr-2" /> Reglas</TabsTrigger>
        </TabsList>

        {/* Carriers Tab */}
        <TabsContent value="carriers">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transportista</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Zonas</TableHead>
                  <TableHead>Tarifas</TableHead>
                  <TableHead>Reglas</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8">Cargando...</TableCell></TableRow>
                ) : carriers.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No hay transportistas configurados</TableCell></TableRow>
                ) : (
                  carriers.map((carrier) => (
                    <TableRow key={carrier.id}>
                      <TableCell>
                        <Link href={`/admin/transportistas/${carrier.id}`} className="font-medium hover:underline">
                          {carrier.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{carrier.slug}</p>
                      </TableCell>
                      <TableCell><code className="font-mono">{carrier.code}</code></TableCell>
                      <TableCell><Badge variant="outline">{formatType(carrier.type)}</Badge></TableCell>
                      <TableCell className="font-mono">{carrier._count.zones}</TableCell>
                      <TableCell className="font-mono">{carrier._count.shipments}</TableCell>
                      <TableCell className="font-mono">{carrier._count.rules}</TableCell>
                      <TableCell className="font-mono">{carrier.priority}</TableCell>
                      <TableCell>
                        <Badge variant={carrier.isActive ? 'default' : 'secondary'}>
                          {carrier.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/transportistas/${carrier.id}`} className="btn btn-ghost btn-sm" title="Editar">
                            <Edit className="h-4 w-4" />
                          </Link>
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
        </TabsContent>

        {/* Zones Tab */}
        <TabsContent value="zonas">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zona</TableHead>
                  <TableHead>Transportista</TableHead>
                  <TableHead>Países</TableHead>
                  <TableHead>Regiones</TableHead>
                  <TableHead>Tarifas</TableHead>
                  <TableHead>Reglas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8">Cargando...</TableCell></TableRow>
                ) : zones.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No hay zonas configuradas</TableCell></TableRow>
                ) : (
                  zones.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell className="font-medium">{zone.name}</TableCell>
                      <TableCell>{carriers.find(c => c.id === zone.carrierId)?.name || zone.carrierId}</TableCell>
                      <TableCell><Badge variant="secondary" className="mr-1">{zone.countries.join(', ')}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{zone.regions.join(', ') || 'Todas'}</TableCell>
                      <TableCell className="font-mono">{zone._count.rates}</TableCell>
                      <TableCell className="font-mono">{zone._count.rules}</TableCell>
                      <TableCell><Badge variant={zone.isActive ? 'default' : 'secondary'}>{zone.isActive ? 'Activa' : 'Inactiva'}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Rates Tab */}
        <TabsContent value="tarifas">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarifa</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Precio Base</TableHead>
                  <TableHead>Por Kg</TableHead>
                  <TableHead>Por Km</TableHead>
                  <TableHead>Días Est.</TableHead>
                  <TableHead>Peso Min/Max</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8">Cargando...</TableCell></TableRow>
                ) : rates.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No hay tarifas configuradas</TableCell></TableRow>
                ) : (
                  rates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">{rate.name}</TableCell>
                      <TableCell>{zones.find(z => z.id === rate.zoneId)?.name || rate.zoneId}</TableCell>
                      <TableCell className="font-mono">{formatCurrency(rate.basePrice)}</TableCell>
                      <TableCell className="font-mono">{formatCurrency(rate.pricePerKg)}/kg</TableCell>
                      <TableCell className="font-mono">{formatCurrency(rate.pricePerKm)}/km</TableCell>
                      <TableCell className="font-mono">{rate.estimatedDays} días</TableCell>
                      <TableCell className="font-mono text-sm">
                        {rate.pricePerKg !== '0' ? `Min: ${rate.pricePerKg}kg` : 'Sin límite'}
                        {rate.pricePerKm !== '0' && <span className="mx-1">|</span>}
                        {rate.pricePerKm !== '0' ? `Max: ${rate.pricePerKm}kg` : ''}
                      </TableCell>
                      <TableCell><Badge variant={rate.isActive ? 'default' : 'secondary'}>{rate.isActive ? 'Activa' : 'Inactiva'}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="reglas">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Regla</TableHead>
                  <TableHead>Producto/Variante</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Transportista</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8">Cargando...</TableCell></TableRow>
                ) : rules.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No hay reglas configuradas</TableCell></TableRow>
                ) : (
                  rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell><Badge variant="outline">Regla #{rule.id.slice(-6)}</Badge></TableCell>
                      <TableCell className="text-sm">
                        {rule.productId && <Badge variant="secondary">Prod: {rule.productId.slice(-6)}</Badge>}
                        {rule.variantId && <Badge variant="secondary">Var: {rule.variantId.slice(-6)}</Badge>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {rule.categoryId && <Badge variant="secondary">Cat: {rule.categoryId.slice(-6)}</Badge>}
                      </TableCell>
                      <TableCell>
                        {rule.carrierId && <Badge variant="outline">{carriers.find(c => c.id === rule.carrierId)?.code || rule.carrierId}</Badge>}
                      </TableCell>
                      <TableCell>
                        {rule.zoneId && <Badge variant="outline">{zones.find(z => z.id === rule.zoneId)?.name || rule.zoneId}</Badge>}
                      </TableCell>
                      <TableCell>
                        {rule.freeShipping ? <Badge variant="success">Envío Gratis</Badge> :
                         rule.fixedPrice ? <Badge variant="default">Precio Fijo</Badge> :
                         <Badge variant="outline">Multiplicador: {rule.multiplier}x</Badge>}
                      </TableCell>
                      <TableCell className="font-mono">
                        {rule.fixedPrice ? formatCurrency(rule.fixedPrice) : rule.multiplier + 'x'}
                      </TableCell>
                      <TableCell className="font-mono">{rule.priority}</TableCell>
                      <TableCell><Badge variant={rule.isActive ? 'default' : 'secondary'}>{rule.isActive ? 'Activa' : 'Inactiva'}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}