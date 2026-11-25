'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { formatPEN } from '@/lib/format';

interface Return {
  id: string;
  returnNumber: string;
  orderId: string;
  order: {
    orderNumber: string;
    user: { name: string | null; email: string } | null;
    Customer: { firstName: string; lastName: string } | null;
  };
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
  orderItem: {
    name: string;
    variantName: string | null;
    productId: string;
  };
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
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
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

export default function DevolucionesPage() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    type: '',
    dateFrom: '',
    dateTo: '',
  });
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchReturns = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.type) params.set('type', filters.type);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);

      const response = await fetch(`/api/admin/devoluciones?${params.toString()}`);

      if (!response.ok) throw new Error('Error al cargar devoluciones');

      const data: ReturnsResponse = await response.json();
      setReturns(data.returns);
      setPagination(prev => ({ ...prev, ...data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const fetchReturnDetail = async (returnId: string) => {
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/admin/devoluciones/${returnId}`);
      if (!response.ok) throw new Error('Error al cargar detalle');
      const data = await response.json();
      setSelectedReturn(data.return);
    } catch (err) {
      alert('Error al cargar el detalle');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [pagination.page, filters.search, filters.status, filters.type, filters.dateFrom, filters.dateTo]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: es });
  };

  const getStatusColor = (status: string) => STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  const getStatusLabel = (status: string) => STATUS_LABELS[status] || status;
  const getTypeLabel = (type: string) => TYPE_LABELS[type] || type;
  const getConditionLabel = (condition: string) => CONDITION_LABELS[condition] || condition;

  const handleStatusChange = async (returnId: string, newStatus: string, note?: string) => {
    try {
      const response = await fetch(`/api/admin/devoluciones/${returnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar');
      }

      fetchReturns();
      if (selectedReturn?.id === returnId) {
        fetchReturnDetail(returnId);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar');
    }
  };

  const handleBulkAction = async (action: string) => {
    const selected = returns.filter(r => r.selected).map(r => r.id);
    if (selected.length === 0) return;

    try {
      const response = await fetch('/api/admin/devoluciones/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: selected }),
      });

      if (!response.ok) throw new Error('Error en acción masiva');
      fetchReturns();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error en acción masiva');
    }
  };

  if (loading && returns.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar + Header */}
      <div className="flex">
        <aside className="w-64 bg-gray-900 min-h-screen hidden lg:block">
          <div className="p-6 border-b border-gray-700">
            <Link href="/admin" className="text-xl font-bold text-white">Admin Pizca</Link>
          </div>
          <nav className="p-4 space-y-2">
            <Link href="/admin/pedidos" className="block px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg">Pedidos</Link>
            <Link href="/admin/devoluciones" className="block px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium">Devoluciones</Link>
            <Link href="/admin/productos" className="block px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg">Productos</Link>
            <Link href="/admin/promociones" className="block px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg">Promociones</Link>
            <Link href="/admin/cupones" className="block px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg">Cupones</Link>
            <Link href="/admin/transportistas" className="block px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg">Transportistas</Link>
            <Link href="/admin/impuestos" className="block px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg">Impuestos</Link>
            <Link href="/admin/reclamos" className="block px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg">Reclamos</Link>
            <Link href="/admin/documentos" className="block px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg">Documentos SUNAT</Link>
          </nav>
        </aside>

        <div className="flex-1">
          <header className="bg-white shadow-sm sticky top-0 z-10">
            <div className="flex items-center justify-between h-16 px-6">
              <h1 className="text-xl font-semibold text-gray-900">Gestión de Devoluciones</h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">Admin</span>
                <a href="/admin" className="text-sm text-emerald-600 hover:underline">Dashboard</a>
              </div>
            </div>
          </header>

          <main className="p-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <StatCard title="Total" value={pagination.total} icon="📦" color="bg-blue-500" />
              <StatCard title="Pendientes" value={returns.filter(r => r.status === 'PENDING').length} icon="⏳" color="bg-amber-500" />
              <StatCard title="Aprobadas" value={returns.filter(r => r.status === 'APPROVED').length} icon="✅" color="bg-blue-500" />
              <StatCard title="Reembolsadas" value={returns.filter(r => r.status === 'REFUNDED').length} icon="💰" color="bg-green-500" />
              <StatCard title="Monto Total" value={formatPEN(returns.reduce((sum, r) => sum + r.refundAmount, 0))} icon="💵" color="bg-emerald-500" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                    placeholder="N° devolución, pedido, cliente..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div className="w-full sm:w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Todos</option>
                    <option value="PENDING">Pendiente</option>
                    <option value="APPROVED">Aprobada</option>
                    <option value="REJECTED">Rechazada</option>
                    <option value="RECEIVED">Recibida</option>
                    <option value="REFUNDED">Reembolsada</option>
                    <option value="PARTIAL_REFUND">Reembolso parcial</option>
                  </select>
                </div>

                <div className="w-full sm:w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Todos</option>
                    <option value="RETURN">Devolución</option>
                    <option value="EXCHANGE">Cambio</option>
                    <option value="WARRANTY">Garantía</option>
                    <option value="DAMAGED">Dañado en envío</option>
                    <option value="WRONG_ITEM">Producto incorrecto</option>
                  </select>
                </div>

                <div className="w-full sm:w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div className="w-full sm:w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-end lg:w-auto">
                  <button
                    onClick={() => setFilters({ search: '', status: '', type: '', dateFrom: '', dateTo: '' })}
                    className="px-4 py-2 text-gray-600 hover:text-emerald-600 font-medium"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {error && (
                <div className="bg-red-50 border-b border-red-200 px-6 py-4 text-red-700">
                  {error}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        <input
                          type="checkbox"
                          checked={returns.every(r => r.selected)}
                          onChange={(e) => setReturns(returns.map(r => ({ ...r, selected: e.target.checked })))}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Devolución</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {returns.map((ret) => (
                      <tr key={ret.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={ret.selected}
                            onChange={(e) => setReturns(returns.map(r => r.id === ret.id ? { ...r, selected: e.target.checked } : r))}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-mono font-medium text-gray-900">{ret.returnNumber}</div>
                        </td>
                        <td className="px-6 py-4">
                          <Link href={`/admin/pedidos?search=${ret.order.orderNumber}`} className="font-mono text-emerald-600 hover:underline">
                            {ret.order.orderNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <div>{ret.order.user?.name || `${ret.order.Customer?.firstName} ${ret.order.Customer?.lastName}`}</div>
                          <div className="text-sm text-gray-500">{ret.order.user?.email || ''}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">{getTypeLabel(ret.type)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ret.status)}`}>
                            {getStatusLabel(ret.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">{formatPEN(ret.refundAmount)}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatDate(ret.createdAt)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => fetchReturnDetail(ret.id)}
                              className="p-2 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-gray-100 transition"
                              title="Ver detalle"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {returns.length === 0 && (
                <div className="p-12 text-center">
                  <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No hay devoluciones</h3>
                  <p className="mt-2 text-gray-500">No se encontraron devoluciones con los filtros actuales.</p>
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                      disabled={!pagination.hasPrev}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                      disabled={!pagination.hasNext}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bulk Actions */}
            {returns.some(r => r.selected) && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <span className="text-sm text-blue-800">
                  {returns.filter(r => r.selected).length} seleccionadas
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkAction('approve')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => handleBulkAction('reject')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedReturn(null)} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Devolución {selectedReturn.returnNumber}
                </h2>
                <button
                  onClick={() => setSelectedReturn(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {detailLoading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mx-auto"></div>
                </div>
              ) : (
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                  {/* Header Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <DetailCard title="Estado" value={getStatusLabel(selectedReturn.status)} color={getStatusColor(selectedReturn.status).replace('bg-', 'text-').replace('100', '600').replace('800', '700')} />
                    <DetailCard title="Tipo" value={getTypeLabel(selectedReturn.type)} />
                    <DetailCard title="Fecha solicitud" value={formatDate(selectedReturn.createdAt)} />
                  </div>

                  {/* Order Info */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">Información del Pedido</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Pedido</p>
                        <p className="font-medium">{selectedReturn.order.orderNumber}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Cliente</p>
                        <p className="font-medium">{selectedReturn.order.user?.name || `${selectedReturn.order.Customer?.firstName} ${selectedReturn.order.Customer?.lastName}`}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Email</p>
                        <p className="font-medium">{selectedReturn.order.user?.email || 'Cliente invitado'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Motivo</p>
                        <p className="font-medium">{selectedReturn.reason}</p>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Productos a devolver</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <th className="px-4 py-3">Producto</th>
                            <th className="px-4 py-3">Cant.</th>
                            <th className="px-4 py-3">Condición</th>
                            <th className="px-4 py-3">Motivo</th>
                            <th className="px-4 py-3 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedReturn.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-3">
                                <p className="font-medium">{item.orderItem.name}</p>
                                {item.orderItem.variantName && <p className="text-sm text-gray-500">{item.orderItem.variantName}</p>}
                              </td>
                              <td className="px-4 py-3">{item.quantity}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">{getConditionLabel(item.condition)}</span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{item.reason}</td>
                              <td className="px-4 py-3 text-right font-medium">{formatPEN(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">Montos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <DetailCard title="Total devolución" value={formatPEN(selectedReturn.totalAmount)} />
                      <DetailCard title="A reembolsar" value={formatPEN(selectedReturn.refundAmount)} color="text-emerald-700" />
                      <DetailCard title="Diferencia" value={formatPEN(selectedReturn.totalAmount - selectedReturn.refundAmount)} />
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Historial</h3>
                    <div className="space-y-3">
                      <TimelineItem date={formatDate(selectedReturn.createdAt)} title="Devolución solicitada" description="El cliente solicitó la devolución" icon="📝" />
                      {selectedReturn.processedAt && (
                        <TimelineItem date={formatDate(selectedReturn.processedAt)} title="Procesada" description="La devolución fue revisada y procesada" icon="⚙️" />
                      )}
                      {selectedReturn.resolvedAt && (
                        <TimelineItem date={formatDate(selectedReturn.resolvedAt)} title="Resuelta" description="Reembolso completado" icon="✅" color="text-green-600" />
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-200">
                    {selectedReturn.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(selectedReturn.id, 'APPROVED', 'Aprobada por admin')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          Aprobar devolución
                        </button>
                        <button
                          onClick={() => handleStatusChange(selectedReturn.id, 'REJECTED', 'Rechazada por admin')}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                        >
                          Rechazar devolución
                        </button>
                      </>
                    )}

                    {selectedReturn.status === 'APPROVED' && (
                      <button
                        onClick={() => handleStatusChange(selectedReturn.id, 'RECEIVED', 'Recibida en almacén')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                      >
                        Marcar como recibida
                      </button>
                    )}

                    {selectedReturn.status === 'RECEIVED' && (
                      <button
                        onClick={() => handleStatusChange(selectedReturn.id, 'REFUNDED', 'Reembolso procesado')}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                      >
                        Procesar reembolso
                      </button>
                    )}

                    {['REJECTED', 'REFUNDED'].includes(selectedReturn.status) && (
                      <span className="px-4 py-2 text-gray-500 text-sm self-center">Proceso completado</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number | string; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
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