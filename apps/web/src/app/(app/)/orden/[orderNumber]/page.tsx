'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatPEN } from '@/lib/format';

interface OrderDetail {
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
  internalNotes: string | null;
  createdAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelledReason: string | null;
  user: { id: string; name: string | null; email: string } | null;
  Customer: { id: string; firstName: string; lastName: string; documentNumber: string | null; phone: string | null } | null;
  shippingAddressRel: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2: string | null;
    district: string;
    province: string;
    department: string;
    phone: string;
  } | null;
  billingAddressRel: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2: string | null;
    district: string;
    province: string;
    department: string;
    documentType: string | null;
    documentNumber: string | null;
  } | null;
  items: OrderItem[];
  documents: OrderDocument[];
  shipments: Shipment[];
  payments: Payment[];
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
  xmlUrl: string | null;
  cdrUrl: string | null;
  createdAt: string;
}

interface Shipment {
  id: string;
  status: string;
  trackingNumber: string | null;
  carrier: { name: string; code: string } | null;
  shippingAddress: any;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  provider: string;
  providerPaymentId: string | null;
  paymentMethod: string | null;
  createdAt: string;
  paidAt: string | null;
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

const STATUS_STEPS = [
  { key: 'PENDING_PAYMENT', label: 'Pedido', icon: '📝' },
  { key: 'PAYMENT_CONFIRMED', label: 'Pago', icon: '💰' },
  { key: 'PREPARING', label: 'Preparando', icon: '📦' },
  { key: 'READY_TO_SHIP', label: 'Listo', icon: '✅' },
  { key: 'SHIPPED', label: 'Enviado', icon: '🚚' },
  { key: 'DELIVERED', label: 'Entregado', icon: '🎉' },
];

export default function OrderDetailPage() {
  const params = useParams();
  const orderNumber = params.orderNumber as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderNumber}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) throw new Error('Pedido no encontrado');
        if (response.status === 401) {
          window.location.href = `/login?redirect=/orden/${orderNumber}`;
          return;
        }
        throw new Error('Error al cargar el pedido');
      }

      const data = await response.json();
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderNumber]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
  };

  const formatShortDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: es });
  };

  const getStatusColor = (status: string) => STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  const getStatusLabel = (status: string) => STATUS_LABELS[status] || status;

  const getCurrentStepIndex = (status: string) => {
    const index = STATUS_STEPS.findIndex(s => s.key === status);
    return index >= 0 ? index : STATUS_STEPS.length - 1;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando pedido...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h1 className="mt-4 text-xl font-bold text-gray-900">No se pudo cargar el pedido</h1>
          <p className="mt-2 text-gray-600">{error || 'El pedido no existe'}</p>
          <Link href="/mis-pedidos" className="mt-6 inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition">
            Volver a Mis Pedidos
          </Link>
        </div>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex(order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-2xl font-bold text-emerald-600">Pizca del Monte</Link>
            <div className="flex items-center gap-4">
              <Link href="/mis-pedidos" className="text-gray-700 hover:text-emerald-600">← Mis Pedidos</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Order Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">Pedido {order.orderNumber}</h1>
                <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <p className="text-gray-500">
                Realizado el {formatDate(order.createdAt)}
                {order.confirmedAt && ` • Confirmado el ${formatDate(order.confirmedAt)}`}
              </p>
            </div>
            <div className="text-right sm:ml-auto">
              <p className="text-3xl font-bold text-gray-900">{formatPEN(order.total)}</p>
              <p className="text-sm text-gray-500">{order.currency}</p>
            </div>
          </div>

          {/* Progress Tracker */}
          <div className="relative">
            <div className="absolute top-7 left-0 right-0 h-1 bg-gray-200" />
            <div className="relative flex justify-between">
              {STATUS_STEPS.map((step, index) => {
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <div key={step.key} className="relative flex flex-col items-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all ${
                      isActive ? 'bg-emerald-100 border-4 border-emerald-300' : 'bg-gray-100 border-4 border-gray-200'
                    } ${isCurrent ? 'ring-4 ring-emerald-200' : ''}`}>
                      {step.icon}
                    </div>
                    <span className={`mt-2 text-xs font-medium text-center w-20 ${isActive ? 'text-emerald-700' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Items & Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Productos ({order.items.length})</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {order.items.map((item) => (
                  <div key={item.id} className="p-6 flex gap-4">
                    {item.imageUrl && (
                      <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Link href={`/producto/${item.slug || item.productId}`} className="font-medium text-gray-900 hover:text-emerald-600 block">
                        {item.name}{item.variantName && ` - ${item.variantName}`}
                      </Link>
                      <p className="text-sm text-gray-500 mt-1">Cantidad: {item.quantity} × {formatPEN(item.unitPrice)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatPEN(item.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen del Pedido</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal ({order.items.length} art.)</span>
                  <span className="font-medium text-gray-900">{formatPEN(order.subtotal)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Descuento</span>
                    <span className="font-medium">-{formatPEN(order.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Envío</span>
                  <span className="font-medium text-gray-900">{order.shippingAmount === 0 ? 'Gratis' : formatPEN(order.shippingAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">IGV (18%)</span>
                  <span className="font-medium text-gray-900">{formatPEN(order.taxAmount)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between text-lg">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-emerald-600">{formatPEN(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Shipping Info */}
            {(order.shippingCarrier || order.shippingTracking || order.shippingAddressRel) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 012-2h10a2 2 0 012 2v2a2 2 0 01-2 2H7a2 2 0 01-2-2v-2z" />
                  </svg>
                  Información de Envío
                </h2>

                {order.shippingAddressRel && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="font-medium text-gray-900 mb-1">
                      {order.shippingAddressRel.firstName} {order.shippingAddressRel.lastName}
                    </p>
                    <p className="text-gray-600 text-sm">{order.shippingAddressRel.phone}</p>
                    <p className="text-gray-600 text-sm mt-1">{order.shippingAddressRel.addressLine1}</p>
                    {order.shippingAddressRel.addressLine2 && (
                      <p className="text-gray-600 text-sm">{order.shippingAddressRel.addressLine2}</p>
                    )}
                    <p className="text-gray-600 text-sm">
                      {order.shippingAddressRel.district}, {order.shippingAddressRel.province}, {order.shippingAddressRel.department}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {order.shippingCarrier && (
                    <div>
                      <p className="text-sm text-gray-500">Transportista</p>
                      <p className="font-medium text-gray-900">{order.shippingCarrier}</p>
                    </div>
                  )}
                  {order.shippingTracking && (
                    <div>
                      <p className="text-sm text-gray-500">N° Tracking</p>
                      <p className="font-mono font-medium text-gray-900">{order.shippingTracking}</p>
                    </div>
                  )}
                  {order.estimatedDelivery && (
                    <div>
                      <p className="text-sm text-gray-500">Entrega estimada</p>
                      <p className="font-medium text-gray-900">{formatDate(order.estimatedDelivery)}</p>
                    </div>
                  )}
                </div>

                {order.shipments.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <h3 className="font-medium text-gray-900 mb-3">Historial de Envío</h3>
                    <div className="space-y-3">
                      {order.shipments.map((shipment) => (
                        <div key={shipment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${shipment.status === 'DELIVERED' ? 'bg-green-100' : 'bg-blue-100'}`}>
                              <svg className={`w-5 h-5 ${shipment.status === 'DELIVERED' ? 'text-green-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 012-2h10a2 2 0 012 2v2a2 2 0 01-2 2H7a2 2 0 01-2-2v-2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{shipment.carrier?.name || 'Transportista'}</p>
                              <p className="text-sm text-gray-500">{formatDate(shipment.createdAt)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded-full text-xs ${shipment.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                              {shipment.status}
                            </span>
                            {shipment.trackingNumber && (
                              <p className="text-xs text-gray-500 mt-1 font-mono">{shipment.trackingNumber}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Documents */}
            {order.documents.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Documentos Electrónicos SUNAT
                </h2>
                <div className="space-y-3">
                  {order.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {doc.type === 'INVOICE' ? 'Factura' : 'Boleta'} Electrónica
                          </p>
                          <p className="text-sm text-gray-500 font-mono">
                            {doc.series}-{String(doc.number).padStart(8, '0')} • {formatShortDate(doc.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs ${doc.sunatStatus === 'ACEPTADO' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {doc.sunatStatus}
                        </span>
                        {doc.pdfUrl && (
                          <a
                            href={doc.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Descargar PDF
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payments */}
            {order.payments.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pagos
                </h2>
                <div className="space-y-3">
                  {order.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${payment.status === 'APPROVED' ? 'bg-green-100' : payment.status === 'PENDING' ? 'bg-amber-100' : 'bg-red-100'}`}>
                          <svg className={`w-6 h-6 ${payment.status === 'APPROVED' ? 'text-green-600' : payment.status === 'PENDING' ? 'text-amber-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{payment.provider} {payment.paymentMethod ? `(${payment.paymentMethod})` : ''}</p>
                          <p className="text-sm text-gray-500">{formatDate(payment.createdAt)}{payment.paidAt && ` • Pagado ${formatShortDate(payment.paidAt)}`}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${payment.status === 'APPROVED' ? 'text-green-600' : 'text-gray-900'}`}>
                          {formatPEN(payment.amount)}
                        </p>
                        <span className={`px-2 py-1 rounded-full text-xs ${payment.status === 'APPROVED' ? 'bg-green-100 text-green-800' : payment.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Billing Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Información de Facturación
              </h3>

              {order.billingAddressRel ? (
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-gray-900">
                    {order.billingAddressRel.firstName} {order.billingAddressRel.lastName}
                  </p>
                  {order.billingAddressRel.documentType && (
                    <p className="text-gray-600">{order.billingAddressRel.documentType}: {order.billingAddressRel.documentNumber}</p>
                  )}
                  <p className="text-gray-600">{order.billingAddressRel.addressLine1}</p>
                  {order.billingAddressRel.addressLine2 && <p className="text-gray-600">{order.billingAddressRel.addressLine2}</p>}
                  <p className="text-gray-600">{order.billingAddressRel.district}, {order.billingAddressRel.province}, {order.billingAddressRel.department}</p>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Sin información de facturación</p>
              )}
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Tu Información
              </h3>
              <div className="space-y-2 text-sm">
                {order.user && (
                  <>
                    <p className="font-medium text-gray-900">{order.user.name || 'Usuario'}</p>
                    <p className="text-gray-600">{order.user.email}</p>
                  </>
                )}
                {order.Customer && (
                  <>
                    <p className="font-medium text-gray-900">{order.Customer.firstName} {order.Customer.lastName}</p>
                    {order.Customer.documentNumber && <p className="text-gray-600">DNI: {order.Customer.documentNumber}</p>}
                    {order.Customer.phone && <p className="text-gray-600">{order.Customer.phone}</p>}
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Acciones</h3>
              <div className="space-y-3">
                <Link
                  href="/mis-pedidos"
                  className="block w-full text-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition"
                >
                  ← Volver a Mis Pedidos
                </Link>

                {['DELIVERED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(order.status) && (
                  <button
                    onClick={() => reorder(order.id)}
                    className="w-full px-4 py-2 border border-emerald-300 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 text-sm font-medium transition"
                  >
                    Volver a Comprar
                  </button>
                )}

                {['PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'PREPARING'].includes(order.status) && (
                  <button
                    onClick={() => cancelOrder(order.id)}
                    className="w-full px-4 py-2 border border-red-300 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium transition"
                  >
                    Cancelar Pedido
                  </button>
                )}

                {order.balanceDue > 0 && (
                  <a
                    href={`/checkout?order=${order.id}`}
                    className="block w-full text-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm font-medium"
                  >
                    Completar Pago
                  </a>
                )}
              </div>
            </div>

            {/* Internal Notes */}
            {order.internalNotes && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-medium text-amber-900 mb-2">Notas del pedido</h4>
                <p className="text-sm text-amber-800 whitespace-pre-wrap">{order.internalNotes}</p>
              </div>
            )}
          </div>
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

async function reorder(orderId: string) {
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
}

async function cancelOrder(orderId: string) {
  if (!confirm('¿Estás seguro de cancelar este pedido?')) return;

  try {
    const response = await fetch(`/api/orders/${orderId}/cancel`, {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      window.location.reload();
    } else {
      alert('No se pudo cancelar el pedido');
    }
  } catch {
    alert('Error al cancelar el pedido');
  }
}