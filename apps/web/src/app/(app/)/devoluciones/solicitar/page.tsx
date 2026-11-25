'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatPEN } from '@/lib/format';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  variantName?: string | null;
  imageUrl?: string | null;
  productId: string;
}

const RETURN_REASONS = [
  { value: 'DONT_LIKE', label: 'No me gusta / No es lo que esperaba' },
  { value: 'WRONG_SIZE', label: 'Talla/medida incorrecta' },
  { value: 'DAMAGED', label: 'Producto dañado o defectuoso' },
  { value: 'WRONG_ITEM', label: 'Recibí producto incorrecto' },
  { value: 'LATE_DELIVERY', label: 'Llegó muy tarde' },
  { value: 'CHANGED_MIND', label: 'Cambio de opinión' },
  { value: 'QUALITY', label: 'Calidad inferior a la esperada' },
  { value: 'OTHER', label: 'Otro motivo' },
];

const CONDITIONS = [
  { value: 'NEW', label: 'Nuevo (sin abrir, con etiquetas)' },
  { value: 'OPENED', label: 'Abierto (sin usar, con empaque original)' },
  { value: 'USED', label: 'Usado (poco uso)' },
  { value: 'DAMAGED', label: 'Dañado' },
  { value: 'DEFECTIVE', label: 'Defectuoso de fábrica' },
];

const ELIGIBLE_STATUSES = ['DELIVERED'];

export default function SolicitarDevolucionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get('order');

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, { quantity: number; reason: string; condition: string; customReason: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders?status=DELIVERED&limit=50', {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Error al cargar pedidos');

      const data = await response.json();
      setOrders(data.orders);

      // Si viene orderId en URL, preseleccionar
      if (orderIdParam) {
        const order = data.orders.find((o: Order) => o.id === orderIdParam);
        if (order) setSelectedOrder(order);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [orderIdParam]);

  const handleItemChange = (itemId: string, field: string, value: any) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const isItemSelected = (itemId: string) => !!selectedItems[itemId];

  const getSelectedItems = () => {
    if (!selectedOrder) return [];
    return selectedOrder.items.filter(item => isItemSelected(item.id));
  };

  const calculateRefund = () => {
    const items = getSelectedItems();
    return items.reduce((sum, item) => {
      const sel = selectedItems[item.id];
      return sum + (Number(item.unitPrice) * (sel?.quantity || 0));
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOrder) {
      setError('Selecciona un pedido');
      return;
    }

    const items = getSelectedItems();
    if (items.length === 0) {
      setError('Selecciona al menos un producto');
      return;
    }

    // Validar que cada item tenga razón y condición
    for (const item of items) {
      const sel = selectedItems[item.id];
      if (!sel?.reason || !sel?.condition) {
        setError(`Completa motivo y condición para ${item.name}`);
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const returnItems = items.map(item => {
        const sel = selectedItems[item.id];
        return {
          orderItemId: item.id,
          quantity: sel.quantity,
          reason: sel.reason === 'OTHER' ? sel.customReason : sel.reason,
          condition: sel.condition,
        };
      });

      const response = await fetch('/api/devoluciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId: selectedOrder.id,
          type: 'RETURN',
          reason: returnItems.map(i => `${i.reason} (${i.condition})`).join('; '),
          items: returnItems,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al solicitar devolución');
      }

      setSuccess(true);
      setSelectedItems({});
      setSelectedOrder(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: es });

  if (loading) {
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
                <Link href="/devoluciones/solicitar" className="text-emerald-600 font-medium">Devoluciones</Link>
              </nav>
            </div>
            <Link href="/cuenta" className="text-gray-700 hover:text-emerald-600">Mi Cuenta</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Solicitar Devolución</h1>
          <p className="text-gray-600 mt-1">
            Selecciona el pedido y los productos que deseas devolver. Tienes 30 días desde la entrega.
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6" role="alert">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium">¡Devolución solicitada correctamente!</p>
                <p className="text-sm">Te enviaremos un email con las instrucciones para enviar el producto.</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Select Order */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Selecciona tu pedido</h2>

          {orders.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <p className="mt-4 text-gray-600">No tienes pedidos entregados recientes para devolver.</p>
              <p className="text-sm text-gray-500 mt-1">Los pedidos deben estar en estado "Entregado" y tener menos de 30 días.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => {
                    setSelectedOrder(order);
                    setSelectedItems({});
                  }}
                  className={`w-full p-4 rounded-lg border-2 text-left transition ${
                    selectedOrder?.id === order.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedOrder?.id === order.id ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                        <svg className={`w-5 h-5 ${selectedOrder?.id === order.id ? 'text-emerald-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{order.orderNumber}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(order.createdAt)} • {order.items.length} producto{order.items.length !== 1 ? 's' : ''} • {formatPEN(order.total)}
                        </p>
                      </div>
                    </div>
                    {selectedOrder?.id === order.id && (
                      <svg className="w-6 h-6 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: Select Items */}
        {selectedOrder && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">2. Selecciona productos a devolver</h2>
              <button
                onClick={() => { setSelectedOrder(null); setSelectedItems({}); }}
                className="text-sm text-emerald-600 hover:underline"
              >
                Cambiar pedido
              </button>
            </div>

            <div className="space-y-3">
              {selectedOrder.items.map((item) => {
                const isSel = isItemSelected(item.id);
                const sel = selectedItems[item.id] || { quantity: 1, reason: '', condition: '', customReason: '' };
                const maxQty = item.quantity;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-lg border-2 transition ${
                      isSel ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.checked ? 1 : 0)}
                        className="mt-1 w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4">
                          {item.imageUrl && (
                            <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                              <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="64px" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{item.name}{item.variantName && ` - ${item.variantName}`}</p>
                            <p className="text-sm text-gray-500">Disponible: {item.quantity} unidad{item.quantity !== 1 ? 'es' : ''}</p>
                          </div>
                        </div>

                        {isSel && (
                          <div className="mt-4 space-y-4 pt-4 border-t border-gray-200">
                            {/* Quantity */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a devolver</label>
                              <select
                                value={sel.quantity}
                                onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value))}
                                className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                              >
                                {Array.from({ length: maxQty }, (_, i) => i + 1).map(q => (
                                  <option key={q} value={q}>{q}</option>
                                ))}
                              </select>
                            </div>

                            {/* Reason */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de la devolución *</label>
                              <select
                                value={sel.reason}
                                onChange={(e) => handleItemChange(item.id, 'reason', e.target.value)}
                                className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="">Selecciona un motivo</option>
                                {RETURN_REASONS.map(r => (
                                  <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                              </select>
                              {sel.reason === 'OTHER' && (
                                <input
                                  type="text"
                                  value={sel.customReason}
                                  onChange={(e) => handleItemChange(item.id, 'customReason', e.target.value)}
                                  placeholder="Especifica el motivo"
                                  className="mt-2 w-full md:w-96 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                />
                              )}
                            </div>

                            {/* Condition */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Condición del producto *</label>
                              <select
                                value={sel.condition}
                                onChange={(e) => handleItemChange(item.id, 'condition', e.target.value)}
                                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="">Selecciona condición</option>
                                {CONDITIONS.map(c => (
                                  <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                              </select>
                              <p className="mt-1 text-xs text-gray-500">
                                Los productos deben estar en su empaque original. Productos abiertos o usados pueden recibir reembolso parcial.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatPEN(item.unitPrice)} c/u</p>
                        <p className="text-sm text-gray-500">Total: {formatPEN(item.total)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Summary & Submit */}
        {selectedOrder && getSelectedItems().length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">3. Resumen y envío</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Productos a devolver</h3>
                <div className="space-y-2">
                  {getSelectedItems().map(item => {
                    const sel = selectedItems[item.id];
                    return (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.name} × {sel.quantity}</span>
                        <span className="font-medium">{formatPEN(Number(item.unitPrice) * sel.quantity)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Estimación de reembolso</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal productos</span>
                    <span className="font-medium">{formatPEN(calculateRefund())}</span>
                  </div>
                  <div className="flex justify-between text-amber-600">
                    <span>Posible descuento por condición</span>
                    <span>Según evaluación en almacén</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between text-lg">
                    <span className="font-semibold">Total estimado</span>
                    <span className="font-bold text-emerald-600">{formatPEN(calculateRefund())}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-900 mb-2">Proceso de devolución:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Revisaremos tu solicitud en 24-48 horas</li>
                <li>Si es aprobada, recibirás email con etiqueta de envío y dirección</li>
                <li>Envía el producto en su empaque original</li>
                <li>Al recibirlo en nuestro almacén, inspeccionamos la condición</li>
                <li>Procesamos el reembolso a tu método de pago original (5-10 días hábiles)</li>
              </ol>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <button
                type="submit"
                form="return-form"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
              >
                {submitting ? 'Enviando solicitud...' : 'Enviar solicitud de devolución'}
              </button>
            </div>
          </div>
        )}

        {/* Hidden form for submit */}
        <form id="return-form" onSubmit={handleSubmit} className="hidden"></form>

        {/* My Returns Link */}
        <div className="text-center">
          <Link href="/mis-devoluciones" className="text-emerald-600 hover:underline font-medium">
            Ver mis devoluciones solicitadas →
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          © 2024 Pizca del Monte. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}