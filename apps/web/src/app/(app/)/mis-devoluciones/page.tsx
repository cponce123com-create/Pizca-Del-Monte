'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatPEN } from '@/lib/format';

interface Return {
  id: string;
  returnNumber: string;
  orderId: string;
  order: { orderNumber: string };
  status: string;
  type: string;
  reason: string;
  totalAmount: number;
  refundAmount: number;
  items: ReturnItem[];
  createdAt: string;
  processedAt: string | null;
  resolvedAt: string | null;
}

interface ReturnItem {
  id: string;
  orderItemId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  reason: string;
  condition: string;
  orderItem: { name: string; variantName: string | null };
}

interface ReturnsResponse {
  returns: Return[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente de revisión',
  APPROVED: 'Aprobada - Enviar producto',
  REJECTED: 'Rechazada',
  RECEIVED: 'Recibida en almacén',
  REFUNDED: 'Reembolsada',
  PARTIAL_REFUND: 'Reembolso parcial',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  RECEIVED: 'bg-indigo-100 text-indigo-800',
  REFUNDED: 'bg-green-100 text-green-800',
  PARTIAL_REFUND: 'bg-orange-100 text-orange-800',
};

const TYPE_LABELS: Record<string, string> = {
  RETURN: 'Devolución',
  EXCHANGE: 'Cambio',
  WARRANTY: 'Garantía',
  DAMAGED: 'Dañado en envío',
  WRONG_ITEM: 'Producto incorrecto',
};

const CONDITION_LABELS: Record<string, string> = {
  NEW: 'Nuevo (sin abrir)',
  OPENED: 'Abierto (sin usar)',
  USED: 'Usado',
  DAMAGED: 'Dañado',
  DEFECTIVE: 'Defectuoso',
};

export default function MisDevolucionesPage() {
  const [returns, setReturns] = useState<Return[]>([]);
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
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);

  const fetchReturns = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`/api/devoluciones?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login?redirect=/mis-devoluciones';
          return;
        }
        throw new Error('Error al cargar devoluciones');
      }

      const data: ReturnsResponse = await response.json();
      setReturns(data.returns);
      setPagination(prev => ({ ...prev, ...data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [pagination.page, statusFilter]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
  };

  const getStatusColor = (status: string) => STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  const getStatusLabel = (status: string) => STATUS_LABELS[status] || status;
  const getTypeLabel = (type: string) => TYPE_LABELS[type] || type;
  const getConditionLabel = (condition: string) => CONDITION_LABELS[condition] || condition;

  if (loading && returns.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-2xl font-bold text-emerald-600">Pizca del Monte</Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/tienda" className="text-gray-700 hover:text-emerald-600">Tienda</Link>
                <Link href="/mis-pedidos" className="text-gray-700 hover:text-emerald-600">Mis Pedidos</Link>
                <Link href="/mis-devoluciones" className="text-emerald-600 font-medium">Mis Devoluciones</Link>
              </nav>
            </div>
            <Link href="/cuenta" className="text-gray-700 hover:text-emerald-600">Mi Cuenta</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mis Devoluciones</h1>
          <p className="text-gray-600 mt-1">Historial y estado de tus solicitudes de devolución</p>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Todos los estados</option>
                <option value="PENDING">Pendiente de revisión</option>
                <option value="APPROVED">Aprobada - Enviar producto</option>
                <option value="REJECTED">Rechazada</option>
                <option value="RECEIVED">Recibida en almacén</option>
                <option value="REFUNDED">Reembolsada</option>
                <option value="PARTIAL_REFUND">Reembolso parcial</option>
              </select>
            </div>

            <div className="flex items-end sm:w-auto">
              <button
                onClick={() => { setStatusFilter(''); fetchReturns(); }}
                className="px-4 py-2 text-gray-600 hover:text-emerald-600 font-medium"
              >
                Limpiar filtro
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Returns List */}
        {returns.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No tienes devoluciones</h3>
            <p className="mt-2 text-gray-500">Cuando solicites una devolución, aparecerá aquí.</p>
            <Link href="/devoluciones/solicitar" className="mt-6 inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition">
              Solicitar devolución
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {returns.map((ret) => (
                <div key={ret.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-bold text-gray-900">{ret.returnNumber}</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ret.status)}`}>
                              {getStatusLabel(ret.status)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Solicitada el {formatDate(ret.createdAt)}
                            {ret.processedAt && ` • Procesada el ${formatDate(ret.processedAt)}`}
                            {ret.resolvedAt && ` • Resuelta el ${formatDate(ret.resolvedAt)}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">{formatPEN(ret.refundAmount)}</p>
                          <p className="text-sm text-gray-500">A reembolsar</p>
                        </div>
                        <button
                          onClick={() => setSelectedReturn(ret)}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition"
                        >
                          Ver detalle
                        </button>
                      </div>
                    </div>

                    {/* Quick info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Pedido</p>
                        <Link href={`/orden/${ret.order.orderNumber}`} className="font-medium text-emerald-600 hover:underline">
                          {ret.order.orderNumber}
                        </Link>
                      </div>
                      <div>
                        <p className="text-gray-500">Tipo</p>
                        <p className="font-medium">{getTypeLabel(ret.type)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Productos</p>
                        <p className="font-medium">{ret.items.length} artículo{ret.items.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                </div>
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

        {/* CTA for new return */}
        <div className="mt-8 text-center">
          <Link href="/devoluciones/solicitar" className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Solicitar nueva devolución
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          © 2024 Pizca del Monte. Todos los derechos reservados.
        </div>
      </footer>

      {/* Detail Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedReturn(null)} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Detalle: {selectedReturn.returnNumber}</h2>
                <button onClick={() => setSelectedReturn(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {/* Status Badge */}
                <div className="mb-6">
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(selectedReturn.status)}`}>
                    {getStatusLabel(selectedReturn.status)}
                  </span>
                </div>

                {/* Timeline */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Historial</h3>
                  <div className="space-y-3">
                    <TimelineItem date={formatDate(selectedReturn.createdAt)} title="Solicitud enviada" description="Tu solicitud fue recibida y está en cola de revisión" icon="📝" />
                    {selectedReturn.processedAt && (
                      <TimelineItem date={formatDate(selectedReturn.processedAt)} title={selectedReturn.status === 'REJECTED' ? 'Rechazada' : 'Aprobada'} description={selectedReturn.status === 'REJECTED' ? 'La devolución fue rechazada' : 'La devolución fue aprobada, puedes enviar el producto'} icon={selectedReturn.status === 'REJECTED' ? '❌' : '✅'} color={selectedReturn.status === 'REJECTED' ? 'text-red-600' : 'text-green-600'} />
                    )}
                    {selectedReturn.resolvedAt && (
                      <TimelineItem date={formatDate(selectedReturn.resolvedAt)} title="Reembolso procesado" description="El reembolso fue enviado a tu método de pago original" icon="💰" color="text-emerald-600" />
                    )}
                  </div>
                </div>

                {/* Order Info */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Pedido original</h3>
                  <Link href={`/orden/${selectedReturn.order.orderNumber}`} className="text-emerald-600 hover:underline font-medium">{selectedReturn.order.orderNumber}</Link>
                </div>

                {/* Items */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Productos</h3>
                  <div className="space-y-3">
                    {selectedReturn.items.map((item) => (
                      <div key={item.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="font-medium text-gray-900">{item.orderItem.name}{item.orderItem.variantName && ` - ${item.orderItem.variantName}`}</p>
                            <p className="text-gray-500">Cantidad: {item.quantity}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Condición declarada</p>
                            <p className="font-medium">{getConditionLabel(item.condition)}</p>
                          </div>
                          <div className="sm:col-span-2">
                            <p className="text-gray-500">Motivo</p>
                            <p className="font-medium">{item.reason}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">{formatPEN(item.total)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Amounts */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Montos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Total productos</p>
                      <p className="font-semibold text-gray-900">{formatPEN(selectedReturn.totalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">A reembolsar</p>
                      <p className="font-semibold text-emerald-600">{formatPEN(selectedReturn.refundAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Diferencia</p>
                      <p className="font-semibold text-gray-900">{formatPEN(selectedReturn.totalAmount - selectedReturn.refundAmount)}</p>
                    </div>
                  </div>
                </div>

                {/* Instructions based on status */}
                {selectedReturn.status === 'APPROVED' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-blue-900 mb-2">Próximos pasos:</h4>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Revisa tu email para la etiqueta de envío e instrucciones</li>
                      <li>Empaca el producto en su empaque original con todos los accesorios</li>
                      <li>Pega la etiqueta en el paquete y entrégalo en el punto de envío indicado</li>
                      <li>Guarda el comprobante de envío</li>
                      <li>Una vez recibamos y verifiquemos el producto, procesaremos tu reembolso</li>
                    </ol>
                  </div>
                )}

                {selectedReturn.status === 'REJECTED' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-red-900 mb-2">Devolución rechazada</h4>
                    <p className="text-sm text-red-800">Esta devolución fue rechazada. Si no estás de acuerdo, puedes contactarnos respondiendo al email de notificación.</p>
                  </div>
                )}

                {selectedReturn.status === 'REFUNDED' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-green-900 mb-2">¡Reembolso completado!</h4>
                    <p className="text-sm text-green-800">El reembolso ha sido procesado a tu método de pago original. Puede tardar 5-10 días hábiles en reflejarse en tu cuenta.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineItem({ date, title, description, icon, color = 'text-gray-600' }: { date: string; title: string; description: string; icon: string; color?: string }) {
  return (
    <div className="flex gap-4">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${color}`}>{icon}</div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
        <p className="text-xs text-gray-400 mt-1">{date}</p>
      </div>
    </div>
  );
}