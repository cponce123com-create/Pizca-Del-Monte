'use client';

import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Package, Truck, CreditCard, RefreshCw, Eye, MoreHorizontal, AlertCircle, CheckCircle, XCircle, Clock, DollarSign, FileText, Download, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Order = {
  id: string;
  orderNumber: string;
  userId: string | null;
  guestEmail: string | null;
  status: string;
  currency: string;
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  paymentMethod: string | null;
  paymentReference: string | null;
  shippingMethod: string | null;
  shippingCarrier: string | null;
  shippingTracking: string | null;
  estimatedDelivery: string | null;
  documentType: string | null;
  documentSeries: string | null;
  documentNumber: string | null;
  documentSunatStatus: string | null;
  createdAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  user: { id: string; name: string | null; email: string } | null;
  Customer: { id: string; firstName: string; lastName: string; documentNumber: string | null } | null;
  items: { id: string; name: string; quantity: number; unitPrice: number; total: number }[];
  payments: { id: string; amount: number; status: string; provider: string; createdAt: string }[];
  shipments: { id: string; status: string; trackingNumber: string | null; carrier: { name: string } | null }[];
  documents: { id: string; type: string; series: string; number: number; sunatStatus: string | null; pdfUrl: string | null }[];
};

export default function PedidosPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string; status?: string; paymentStatus?: string; dateFrom?: string; dateTo?: string }> }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: '', note: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || '';
  const status = params.status || '';
  const paymentStatus = params.paymentStatus || '';
  const dateFrom = params.dateFrom || '';
  const dateTo = params.dateTo || '';

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('page', page.toString());
      searchParams.set('limit', '20');
      if (search) searchParams.set('search', search);
      if (status) searchParams.set('status', status);
      if (paymentStatus) searchParams.set('paymentStatus', paymentStatus);
      if (dateFrom) searchParams.set('dateFrom', dateFrom);
      if (dateTo) searchParams.set('dateTo', dateTo);
      searchParams.set('sort', sortConfig.key);
      searchParams.set('order', sortConfig.direction);

      const res = await fetch(`/api/admin/pedidos?${searchParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
        setPagination({ page: data.page, totalPages: data.totalPages, total: data.total });
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ChevronDown className="h-4 w-4 text-muted-foreground" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const formatStatus = (status: string) => {
    const statuses: Record<string, { label: string; icon: any; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
      PENDING_PAYMENT: { label: 'Pendiente Pago', icon: Clock, variant: 'warning' },
      PAYMENT_CONFIRMED: { label: 'Pago Confirmado', icon: CheckCircle, variant: 'success' },
      PREPARING: { label: 'Preparando', icon: Package, variant: 'default' },
      READY_TO_SHIP: { label: 'Listo para Envío', icon: Truck, variant: 'default' },
      SHIPPED: { label: 'Enviado', icon: Truck, variant: 'default' },
      DELIVERED: { label: 'Entregado', icon: CheckCircle, variant: 'success' },
      CANCELLED: { label: 'Cancelado', icon: XCircle, variant: 'destructive' },
      REFUNDED: { label: 'Reembolsado', icon: DollarSign, variant: 'secondary' },
      PARTIALLY_REFUNDED: { label: 'Reembolso Parcial', icon: DollarSign, variant: 'warning' },
      ON_HOLD: { label: 'En Espera', icon: AlertCircle, variant: 'outline' },
      DISPUTED: { label: 'En Disputa', icon: AlertCircle, variant: 'destructive' },
    };
    return statuses[status] || { label: status, icon: Package, variant: 'outline' };
  };

  const formatPaymentStatus = (status: string) => {
    const statuses: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
      PENDING: { label: 'Pendiente', variant: 'warning' },
      PROCESSING: { label: 'Procesando', variant: 'default' },
      APPROVED: { label: 'Aprobado', variant: 'success' },
      REJECTED: { label: 'Rechazado', variant: 'destructive' },
      REFUNDED: { label: 'Reembolsado', variant: 'secondary' },
      PARTIALLY_REFUNDED: { label: 'Reembolso Parcial', variant: 'warning' },
      CHARGEBACK: { label: 'Chargeback', variant: 'destructive' },
      CANCELLED: { label: 'Cancelado', variant: 'outline' },
      EXPIRED: { label: 'Expirado', variant: 'outline' },
    };
    return statuses[status] || { label: status, variant: 'outline' };
  };

  const openDetailDialog = (order: Order) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const openStatusDialog = (order: Order) => {
    setSelectedOrder(order);
    setStatusForm({ status: order.status, note: '' });
    setStatusDialogOpen(true);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !statusForm.status || statusForm.status === selectedOrder.status) return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/pedidos/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusForm.status, note: statusForm.note }),
      });
      if (res.ok) {
        setStatusDialogOpen(false);
        window.location.reload();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al actualizar estado');
      }
    } catch (error) {
      alert('Error de conexión');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRegenerateDocument = async (order: Order) => {
    if (!confirm('¿Regenerar documento electrónico?')) return;
    try {
      const res = await fetch('/api/admin/documentos/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, forceRegenerate: true }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al regenerar documento');
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  const getCustomerName = (order: Order) => {
    if (order.Customer) return `${order.Customer.firstName} ${order.Customer.lastName}`;
    if (order.user) return order.user.name || order.user.email;
    return order.guestEmail || 'Cliente invitado';
  };

  const getCustomerDocument = (order: Order) => {
    return order.Customer?.documentNumber || '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8" />
            Gestión de Pedidos
          </h1>
          <p className="text-muted-foreground">Visualiza, filtra y gestiona el estado de todos los pedidos</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-7">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-orange-600">{orders.filter(o => o.status === 'PENDING_PAYMENT').length}</div><div className="text-sm text-muted-foreground">Pendientes Pago</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-blue-600">{orders.filter(o => o.status === 'PAYMENT_CONFIRMED').length}</div><div className="text-sm text-muted-foreground">Pago Confirmado</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-purple-600">{orders.filter(o => ['PREPARING', 'READY_TO_SHIP'].includes(o.status)).length}</div><div className="text-sm text-muted-foreground">En Preparación</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-indigo-600">{orders.filter(o => o.status === 'SHIPPED').length}</div><div className="text-sm text-muted-foreground">Enviados</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-green-600">{orders.filter(o => o.status === 'DELIVERED').length}</div><div className="text-sm text-muted-foreground">Entregados</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-red-600">{orders.filter(o => ['CANCELLED', 'REFUNDED'].includes(o.status)).length}</div><div className="text-sm text-muted-foreground">Cancelados/Reembolsados</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-gray-600">{orders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}</div><div className="text-sm text-muted-foreground">Total Ventas (PEN)</div></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-4 bg-card p-4 rounded-lg border">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por #orden, cliente, email, tracking..."
            value={search}
            onChange={(e) => { const p = new URLSearchParams(window.location.search); p.set('search', e.target.value); p.set('page', '1'); window.location.search = p.toString(); }}
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={(v) => { const p = new URLSearchParams(window.location.search); if (v) p.set('status', v); else p.delete('status'); p.set('page', '1'); window.location.search = p.toString(); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado Pedido" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="PENDING_PAYMENT">Pendiente Pago</SelectItem>
            <SelectItem value="PAYMENT_CONFIRMED">Pago Confirmado</SelectItem>
            <SelectItem value="PREPARING">Preparando</SelectItem>
            <SelectItem value="READY_TO_SHIP">Listo para Envío</SelectItem>
            <SelectItem value="SHIPPED">Enviado</SelectItem>
            <SelectItem value="DELIVERED">Entregado</SelectItem>
            <SelectItem value="CANCELLED">Cancelado</SelectItem>
            <SelectItem value="REFUNDED">Reembolsado</SelectItem>
            <SelectItem value="PARTIALLY_REFUNDED">Reembolso Parcial</SelectItem>
            <SelectItem value="ON_HOLD">En Espera</SelectItem>
            <SelectItem value="DISPUTED">En Disputa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentStatus} onValueChange={(v) => { const p = new URLSearchParams(window.location.search); if (v) p.set('paymentStatus', v); else p.delete('paymentStatus'); p.set('page', '1'); window.location.search = p.toString(); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado Pago" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="PENDING">Pendiente</SelectItem>
            <SelectItem value="APPROVED">Aprobado</SelectItem>
            <SelectItem value="REJECTED">Rechazado</SelectItem>
            <SelectItem value="REFUNDED">Reembolsado</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => { const p = new URLSearchParams(window.location.search); if (e.target.value) p.set('dateFrom', e.target.value); else p.delete('dateFrom'); p.set('page', '1'); window.location.search = p.toString(); }} placeholder="Desde" className="w-[160px]" />
        <Input type="date" value={dateTo} onChange={(e) => { const p = new URLSearchParams(window.location.search); if (e.target.value) p.set('dateTo', e.target.value); else p.delete('dateTo'); p.set('page', '1'); window.location.search = p.toString(); }} placeholder="Hasta" className="w-[160px]" />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort('orderNumber')}>
                <div className="flex items-center gap-2">Número <getSortIcon key="orderNumber" /></div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('customerName')}>
                <div className="flex items-center gap-2">Cliente <getSortIcon key="customerName" /></div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('createdAt')}>
                <div className="flex items-center gap-2">Fecha <getSortIcon key="createdAt" /></div>
              </TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado Pedido</TableHead>
              <TableHead>Estado Pago</TableHead>
              <TableHead>Envío</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead className="w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8">Cargando...</TableCell></TableRow>
            ) : orders.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No se encontraron pedidos</TableCell></TableRow>
            ) : (
              orders.map((o) => {
                const statusInfo = formatStatus(o.status);
                const paymentInfo = o.payments[0] ? formatPaymentStatus(o.payments[0].status) : { label: 'Sin pagos', variant: 'outline' as const };
                const hasTracking = o.shipments.some(s => s.trackingNumber);
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono font-medium">{o.orderNumber}</TableCell>
                    <TableCell>
                      <p className="font-medium">{getCustomerName(o)}</p>
                      <p className="text-xs text-muted-foreground">Doc: {getCustomerDocument(o)}</p>
                    </TableCell>
                    <TableCell>{format(new Date(o.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}</TableCell>
                    <TableCell className="font-mono font-semibold">
                      {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(o.total)}
                    </TableCell>
                    <TableCell><Badge variant={statusInfo.variant}><statusInfo.icon className="h-3 w-3 mr-1" /> {statusInfo.label}</Badge></TableCell>
                    <TableCell><Badge variant={paymentInfo.variant}>{paymentInfo.label}</Badge></TableCell>
                    <TableCell>
                      {o.shippingCarrier && (
                        <div className="flex items-center gap-1">
                          <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{o.shippingCarrier}</span>
                        </div>
                      )}
                      {o.shippingTracking && (
                        <p className="text-xs font-mono text-primary mt-1">{o.shippingTracking}</p>
                      )}
                      {o.estimatedDelivery && (
                        <p className="text-xs text-muted-foreground mt-1">Est: {format(new Date(o.estimatedDelivery), 'dd/MM', { locale: es })}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {o.documentSeries && o.documentNumber && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{o.documentType === 'INVOICE' ? 'Factura' : 'Boleta'} {o.documentSeries}-{String(o.documentNumber).padStart(8, '0')}</Badge>
                          {o.documentSunatStatus && (
                            <Badge variant={o.documentSunatStatus === 'ACEPTADO' ? 'success' : o.documentSunatStatus === 'RECHAZADO' ? 'destructive' : 'warning'} className="text-xs">
                              {o.documentSunatStatus}
                            </Badge>
                          )}
                        </div>
                      )}
                      {!o.documentSeries && o.status !== 'PENDING_PAYMENT' && o.status !== 'CANCELLED' && (
                        <Badge variant="secondary" className="text-xs">Sin documento</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openDetailDialog(o)} title="Ver detalle">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openStatusDialog(o)} title="Cambiar estado">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        {o.documentSeries && o.documentSunatStatus === 'ACEPTADO' && (
                          <Button variant="ghost" size="icon" onClick={() => handleRegenerateDocument(o)} title="Regenerar documento">
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Mostrando {((page - 1) * 20) + 1} a {Math.min(page * 20, pagination.total)} de {pagination.total} pedidos</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => { const p = new URLSearchParams(window.location.search); p.set('page', (page - 1).toString()); window.location.search = p.toString(); }}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page === pagination.totalPages} onClick={() => { const p = new URLSearchParams(window.location.search); p.set('page', (page + 1).toString()); window.location.search = p.toString(); }}>Siguiente</Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Pedido {selectedOrder.orderNumber}</span>
                  <Badge variant={formatStatus(selectedOrder.status).variant}>
                    <formatStatus(selectedOrder.status).icon className="h-3 w-3 mr-1" /> {formatStatus(selectedOrder.status).label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Customer Info */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Cliente</p><p className="font-medium">{getCustomerName(selectedOrder)}</p><p className="text-sm text-muted-foreground">{selectedOrder.guestEmail || selectedOrder.user?.email}</p></CardContent></Card>
                  <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Documento</p><p className="font-mono">{getCustomerDocument(selectedOrder)}</p></CardContent></Card>
                  <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Fecha</p><p>{format(new Date(selectedOrder.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}</p></CardContent></Card>
                </div>

                {/* Totals */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Subtotal</p><p className="font-medium">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(selectedOrder.subtotal)}</p></CardContent></Card>
                  <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Descuento</p><p className="font-medium text-green-600">-{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(selectedOrder.discountAmount)}</p></CardContent></Card>
                  <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Envío</p><p className="font-medium">{selectedOrder.shippingAmount === 0 ? 'Gratis' : new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(selectedOrder.shippingAmount)}</p></CardContent></Card>
                  <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">IGV</p><p className="font-medium">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(selectedOrder.taxAmount)}</p></CardContent></Card>
                  <Card className="md:col-span-4"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(selectedOrder.total)}</p></CardContent></Card>
                </div>

                {/* Items */}
                <div>
                  <h4 className="font-medium mb-3">Productos</h4>
                  <Table>
                    <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead className="text-right">Cant.</TableHead><TableHead className="text-right">Precio Unit.</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {selectedOrder.items.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(item.unitPrice)}</TableCell>
                          <TableCell className="text-right font-medium">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(item.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Payments */}
                {selectedOrder.payments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Pagos</h4>
                    <Table>
                      <TableHeader><TableRow><TableHead>Método</TableHead><TableHead>Proveedor</TableHead><TableHead className="text-right">Monto</TableHead><TableHead>Estado</TableHead><TableHead>Fecha</TableHead><TableHead>Referencia</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {selectedOrder.payments.map(p => (
                          <TableRow key={p.id}>
                            <TableCell>{p.provider || 'N/A'}</TableCell>
                            <TableCell>{p.provider}</TableCell>
                            <TableCell className="text-right">{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(p.amount)}</TableCell>
                            <TableCell><Badge variant={formatPaymentStatus(p.status).variant}>{formatPaymentStatus(p.status).label}</Badge></TableCell>
                            <TableCell>{format(new Date(p.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}</TableCell>
                            <TableCell className="font-mono text-xs">{p.status === 'APPROVED' ? selectedOrder.paymentReference : '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Shipments */}
                {selectedOrder.shipments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Envíos</h4>
                    <Table>
                      <TableHeader><TableRow><TableHead>Transportista</TableHead><TableHead>Tracking</TableHead><TableHead>Estado</TableHead><TableHead>Fecha Envío</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {selectedOrder.shipments.map(s => (
                          <TableRow key={s.id}>
                            <TableCell>{s.carrier?.name || 'N/A'}</TableCell>
                            <TableCell className="font-mono">{s.trackingNumber || '—'}</TableCell>
                            <TableCell><Badge variant={formatStatus(s.status).variant}>{formatStatus(s.status).label}</Badge></TableCell>
                            <TableCell>{s.status !== 'PENDING' ? format(new Date(s.status), 'dd/MM/yyyy', { locale: es }) : '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Documents */}
                {selectedOrder.documents.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Documentos Electrónicos</h4>
                    <Table>
                      <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Serie-Número</TableHead><TableHead>Estado SUNAT</TableHead><TableHead>PDF</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {selectedOrder.documents.map(d => (
                          <TableRow key={d.id}>
                            <TableCell><Badge variant="outline">{d.type === 'INVOICE' ? 'Factura' : 'Boleta'}</Badge></TableCell>
                            <TableCell className="font-mono">{d.series}-{String(d.number).padStart(8, '0')}</TableCell>
                            <TableCell><Badge variant={d.sunatStatus === 'ACEPTADO' ? 'success' : d.sunatStatus === 'RECHAZADO' ? 'destructive' : 'warning'}>{d.sunatStatus}</Badge></TableCell>
                            <TableCell>{d.pdfUrl && <Button variant="ghost" size="icon" asChild><a href={d.pdfUrl} target="_blank"><Download className="h-4 w-4" /></a></Button>}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar Estado del Pedido</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-1 p-3 bg-muted/50 rounded-lg">
                <p><strong>Pedido:</strong> {selectedOrder.orderNumber}</p>
                <p><strong>Cliente:</strong> {getCustomerName(selectedOrder)}</p>
                <p><strong>Estado actual:</strong> <Badge variant={formatStatus(selectedOrder.status).variant}>{formatStatus(selectedOrder.status).label}</Badge></p>
              </div>
              <div>
                <Label>Nuevo Estado *</Label>
                <Select value={statusForm.status} onValueChange={v => setStatusForm(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING_PAYMENT">Pendiente Pago</SelectItem>
                    <SelectItem value="PAYMENT_CONFIRMED">Pago Confirmado</SelectItem>
                    <SelectItem value="PREPARING">Preparando</SelectItem>
                    <SelectItem value="READY_TO_SHIP">Listo para Envío</SelectItem>
                    <SelectItem value="SHIPPED">Enviado</SelectItem>
                    <SelectItem value="DELIVERED">Entregado</SelectItem>
                    <SelectItem value="CANCELLED">Cancelado</SelectItem>
                    <SelectItem value="REFUNDED">Reembolsado</SelectItem>
                    <SelectItem value="PARTIALLY_REFUNDED">Reembolso Parcial</SelectItem>
                    <SelectItem value="ON_HOLD">En Espera</SelectItem>
                    <SelectItem value="DISPUTED">En Disputa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nota interna (opcional)</Label>
                <Textarea value={statusForm.note} onChange={e => setStatusForm(prev => ({ ...prev, note: e.target.value }))} rows={3} placeholder="Motivo del cambio, observaciones..." />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setStatusDialogOpen(false)} disabled={isUpdating}>Cancelar</Button>
                <Button type="submit" disabled={isUpdating || !statusForm.status || statusForm.status === selectedOrder.status}>
                  {isUpdating ? 'Actualizando...' : 'Actualizar Estado'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}