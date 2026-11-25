'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { OrderStatusBadge } from '@/components/orders/order-status-badge';
import { formatPEN } from '@/lib/format';

interface Order {
  id: string;
  orderNumber: string;
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
  documentNumber: number | null;
  documentSunatStatus: string | null;
  createdAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  items: OrderItem[];
  documents: OrderDocument[];
  shipments: Shipment[];
}

interface OrderItem {
  id: string;
  name: string;
  slug?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  variantName?: string | null;
  imageUrl?: string | null;
  productId: string;
}

interface OrderDocument {
  id: string;
  type: string;
  series: string;
  number: number;
  sunatStatus: string;
  pdfUrl: string | null;
}

interface Shipment {
  id: string;
  status: string;
  trackingNumber: string | null;
  carrier: { name: string } | null;
  createdAt: string;
  deliveredAt: string | null;
}

interface OrdersResponse {
  orders: Order[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Pendiente de pago',
  PAYMENT_CONFIRMED: 'Pago confirmado',
  PREPARING: 'En preparación',
  READY_TO_SHIP: 'Listo para enviar',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
  PARTIALLY_REFUNDED: 'Reembolso parcial',
  ON_HOLD: 'En espera',
  DISPUTED: 'En disputa',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: 'bg-amber-100 text-amber-800',
  PAYMENT_CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-indigo-100 text-indigo-800',
  READY_TO_SHIP: 'bg-purple-100 text-purple-800',
  SHIPPED: 'bg-cyan-100 text-cyan-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
  PARTIALLY_REFUNDED: 'bg-orange-100 text-orange-800',
  ON_HOLD: 'bg-gray-100 text-gray-800',
  DISPUTED: 'bg-red-100 text-red-800',
};

export default function MisPedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (statusFilter) params.set('status', statusFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const response = await fetch(`/api/orders?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login?redirect=/mis-pedidos';
          return;
        }
        throw new Error('Error al cargar pedidos');
      }

      const data: OrdersResponse = await response.json();
      setOrders(data.orders);
      setPagination(prev => ({ ...prev, ...data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [pagination.page, statusFilter, dateFrom, dateTo]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
  };

  const getStatusColor = (status: string) => STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  const getStatusLabel = (status: string) => STATUS_LABELS[status] || status;

  const canReorder = (order: Order) => {
    return ['DELIVERED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(order.status);
  };

  const canCancel = (order: Order) => {
    return ['PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'PREPARING'].includes(order.status);
  };

  const handleReorder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/reorder`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        window.location.href = '/carrito';
      } else {
        alert('No se pudo volver a ordenar');
      }
    } catch {
      alert('Error al volver a ordenar');
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm('¿Estás seguro de cancelar este pedido?')) return;

    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        fetchOrders();
      } else {
        alert('No se pudo cancelar el pedido');
      }
    } catch {
      alert('Error al cancelar el pedido');
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando tus pedidos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-2xl font-bold text-emerald-600">Pizca del Monte</Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/tienda" className="text-gray-700 hover:text-emerald-600">Tienda</Link>
                <Link href="/recetas" className="text-gray-700 hover:text-emerald-600">Recetas</Link>
                <Link href="/mis-pedidos" className="text-emerald-600 font-medium">Mis Pedidos</Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/cuenta" className="text-gray-700 hover:text-emerald-600">Mi Cuenta</Link>
              <Link href="/carrito" className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition">
                Carrito
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mis Pedidos</h1>
          <p className="text-gray-600 mt-1">Historial y seguimiento de tus compras</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Todos los estados</option>
                <option value="PENDING_PAYMENT">Pendiente de pago</option>
                <option value="PAYMENT_CONFIRMED">Pago confirmado</option>
                <option value="PREPARING">En preparación</option>
                <option value="READY_TO_SHIP">Listo para enviar</option>
                <option value="SHIPPED">Enviado</option>
                <option value="DELIVERED">Entregado</option>
                <option value="CANCELLED">Cancelado</option>
                <option value="REFUNDED">Reembolsado</option>
                <option value="PARTIALLY_REFUNDED">Reembolso parcial</option>
                <option value="ON_HOLD">En espera</option>
                <option value="DISPUTED">En disputa</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-end sm:w-auto">
              <button
                onClick={() => {
                  setStatusFilter('');
                  setDateFrom('');
                  setDateTo('');
                  fetchOrders();
                }}
                className="px-4 py-2 text-gray-600 hover:text-emerald-600 font-medium"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
            <span>Error: {error}</span>
            <button onClick={fetchOrders} className="text-red-700 hover:underline">Reintentar</button>
          </div>
        )}

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No tienes pedidos aún</h3>
            <p className="mt-2 text-gray-500">Cuando realices una compra, aparecerá aquí.</p>
            <Link href="/tienda" className="mt-6 inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition">
              Ir a la tienda
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  formatDate={formatDate}
                  getStatusColor={getStatusColor}
                  getStatusLabel={getStatusLabel}
                  canReorder={canReorder(order)}
                  canCancel={canCancel(order)}
                  onReorder={handleReorder}
                  onCancel={handleCancel}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Paginación">
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  disabled={!pagination.hasPrev}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Anterior
                </button>

                <span className="px-4 py-2 text-gray-600">
                  Página {pagination.page} de {pagination.totalPages}
                </span>

                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={!pagination.hasNext}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Siguiente
                </button>
              </nav>
            )}
          </>
        )}

        {/* Results info */}
        {orders.length > 0 && (
          <p className="mt-6 text-sm text-gray-500 text-center">
            Mostrando {orders.length} de {pagination.total} pedido{pagination.total !== 1 ? 's' : ''}
          </p>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-semibold mb-4">Pizca del Monte</h3>
              <p className="text-sm">Productos gourmet peruanos de la mejor calidad.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Enlaces</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/tienda" className="hover:text-white">Tienda</Link></li>
                <li><Link href="/recetas" className="hover:text-white">Recetas</Link></li>
                <li><Link href="/nosotros" className="hover:text-white">Nosotros</Link></li>
                <li><Link href="/contacto" className="hover:text-white">Contacto</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Ayuda</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/faq" className="hover:text-white">Preguntas frecuentes</Link></li>
                <li><Link href="/envios" className="hover:text-white">Envíos</Link></li>
                <li><Link href="/devoluciones" className="hover:text-white">Devoluciones</Link></li>
                <li><Link href="/terminos" className="hover:text-white">Términos y condiciones</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Contacto</h3>
              <ul className="space-y-2 text-sm">
                <li>📧 hola@pizcadelmonte.pe</li>
                <li>📞 +51 999 888 777</li>
                <li>📍 Lima, Perú</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            © 2024 Pizca del Monte. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

function OrderCard({
  order,
  formatDate,
  getStatusColor,
  getStatusLabel,
  canReorder,
  canCancel,
  onReorder,
  onCancel,
}: {
  order: Order;
  formatDate: (date: string | null) => string;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  canReorder: boolean;
  canCancel: boolean;
  onReorder: (orderId: string) => void;
  onCancel: (orderId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-gray-900">{order.orderNumber}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Realizado el {formatDate(order.createdAt)}
                {order.confirmedAt && ` • Confirmado el ${formatDate(order.confirmedAt)}`}
                {order.shippedAt && ` • Enviado el ${formatDate(order.shippedAt)}`}
                {order.deliveredAt && ` • Entregado el ${formatDate(order.deliveredAt)}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:ml-auto">
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{formatPEN(order.total)}</p>
              <p className="text-sm text-gray-500">{order.currency}</p>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              aria-label={expanded ? 'Ver menos' : 'Ver más'}
            >
              <svg className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-6 border-b border-gray-100 animate-slide-down">
          {/* Items */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-4">Productos</h4>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                  {item.imageUrl && (
                    <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link href={`/producto/${item.slug || item.productId}`} className="font-medium text-gray-900 hover:text-emerald-600 block truncate">
                      {item.name}{item.variantName && ` - ${item.variantName}`}
                    </Link>
                    <p className="text-sm text-gray-500">Cantidad: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatPEN(item.total)}</p>
                    <p className="text-sm text-gray-500">{formatPEN(item.unitPrice)} c/u</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <DetailCard title="Subtotal" value={formatPEN(order.subtotal)} />
            {order.discountAmount > 0 && (
              <DetailCard title="Descuento" value={`-${formatPEN(order.discountAmount)}`} color="text-emerald-600" />
            )}
            <DetailCard title="Envío" value={order.shippingAmount === 0 ? 'Gratis' : formatPEN(order.shippingAmount)} />
            <DetailCard title="IGV (18%)" value={formatPEN(order.taxAmount)} />
          </div>

          {/* Shipping Info */}
          {(order.shippingCarrier || order.shippingTracking) && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 012-2h10a2 2 0 012 2v2a2 2 0 01-2 2H7a2 2 0 01-2-2v-2z" />
                </svg>
                Información de Envío
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {order.shippingCarrier && (
                  <div>
                    <p className="text-blue-700 font-medium">Transportista</p>
                    <p className="text-blue-900">{order.shippingCarrier}</p>
                  </div>
                )}
                {order.shippingTracking && (
                  <div>
                    <p className="text-blue-700 font-medium">N° Tracking</p>
                    <p className="text-blue-900 font-mono">{order.shippingTracking}</p>
                  </div>
                )}
                {order.estimatedDelivery && (
                  <div className="sm:col-span-2">
                    <p className="text-blue-700 font-medium">Entrega estimada</p>
                    <p className="text-blue-900">{formatDate(order.estimatedDelivery)}</p>
                  </div>
                )}
              </div>
              {order.shipments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-2">Historial de envío:</p>
                  <div className="space-y-2">
                    {order.shipments.map((shipment) => (
                      <div key={shipment.id} className="flex items-center justify-between text-sm">
                        <span className="text-blue-700">{shipment.carrier?.name || 'Transportista'} - {formatDate(shipment.createdAt)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${shipment.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                          {shipment.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Documents */}
          {order.documents.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Documentos Electrónicos</h4>
              <div className="space-y-2">
                {order.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {doc.type === 'INVOICE' ? 'Factura' : 'Boleta'} Electrónica
                        </p>
                        <p className="text-sm text-gray-500 font-mono">
                          {doc.series}-{String(doc.number).padStart(8, '0')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${doc.sunatStatus === 'ACEPTADO' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {doc.sunatStatus}
                      </span>
                      {doc.pdfUrl && (
                        <a
                          href={doc.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Descargar
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
            <Link
              href={`/orden/${order.orderNumber}`}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
            >
              Ver Detalle Completo
            </Link>

            {canReorder && (
              <button
                onClick={() => onReorder(order.id)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition"
              >
                Volver a Comprar
              </button>
            )}

            {canCancel && (
              <button
                onClick={() => onCancel(order.id)}
                className="px-4 py-2 border border-red-300 rounded-lg hover:bg-red-50 text-sm font-medium text-red-700 transition"
              >
                Cancelar Pedido
              </button>
            )}

            {order.balanceDue > 0 && (
              <Link
                href={`/checkout?order=${order.id}`}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm font-medium"
              >
                Completar Pago
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailCard({ title, value, color = 'text-gray-900' }: { title: string; value: string; color?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`font-semibold ${color} mt-1`}>{value}</p>
    </div>
  );
}