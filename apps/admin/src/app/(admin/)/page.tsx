'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

const stats = [
  {
    name: 'Productos Totales',
    value: '1,234',
    change: '+12%',
    trend: 'up',
    icon: Package,
    color: 'primary',
  },
  {
    name: 'Pedidos Hoy',
    value: '56',
    change: '+8%',
    trend: 'up',
    icon: ShoppingCart,
    color: 'success',
  },
  {
    name: 'Clientes Nuevos',
    value: '23',
    change: '-5%',
    trend: 'down',
    icon: Users,
    color: 'accent',
  },
  {
    name: 'Ingresos Mes',
    value: 'S/ 45,670',
    change: '+15%',
    trend: 'up',
    icon: DollarSign,
    color: 'secondary',
  },
];

const recentOrders = [
  { id: 'ORD-2024-001', customer: 'Juan Pérez', total: 'S/ 289.00', status: 'delivered', date: 'Hace 2 horas' },
  { id: 'ORD-2024-002', customer: 'María González', total: 'S/ 156.50', status: 'shipped', date: 'Hace 4 horas' },
  { id: 'ORD-2024-003', customer: 'Carlos Mendoza', total: 'S/ 445.00', status: 'processing', date: 'Hace 6 horas' },
  { id: 'ORD-2024-004', customer: 'Ana Rodríguez', total: 'S/ 89.00', status: 'confirmed', date: 'Hace 8 horas' },
  { id: 'ORD-2024-005', customer: 'Luis Torres', total: 'S/ 234.50', status: 'pending', date: 'Hace 10 horas' },
];

const lowStockProducts = [
  { name: 'Ají Rocoto Molido 30g', sku: 'PDM-AJI-ROC-030G', stock: 3, threshold: 10 },
  { name: 'Aceite Infusionado Ají Charapita 250ml', sku: 'PDM-ACE-AJI-250ML', stock: 5, threshold: 10 },
  { name: 'Pack Parrilla Peruana', sku: 'PDM-PACK-PAR-001', stock: 2, threshold: 5 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-md font-heading font-medium">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Resumen de tu tienda Pizca del Monte</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Tiempo real</Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.name} stat={stat} />
        ))}
      </div>

      {/* Charts & Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pedidos Recientes</CardTitle>
            <a href="/admin/pedidos" className="text-body-sm text-primary hover:underline">
              Ver todos
            </a>
          </CardHeader>
          <CardContent>
            <div className="table-container">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-head">Pedido</th>
                    <th className="table-head">Cliente</th>
                    <th className="table-head">Total</th>
                    <th className="table-head">Estado</th>
                    <th className="table-head">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="table-row">
                      <td className="table-cell font-mono font-medium">{order.id}</td>
                      <td className="table-cell">{order.customer}</td>
                      <td className="table-cell font-medium">{order.total}</td>
                      <td className="table-cell">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="table-cell text-muted-foreground">{order.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Stock Bajo
            </CardTitle>
            <a href="/admin/productos?stock=low" className="text-body-sm text-primary hover:underline">
              Ver todos
            </a>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockProducts.map((product) => (
                <div key={product.sku} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-body-sm text-muted-foreground">{product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-destructive">{product.stock} unidades</p>
                    <p className="text-body-xs text-muted-foreground">Mín: {product.threshold}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              icon={Package}
              title="Nuevo Producto"
              description="Agregar producto al catálogo"
              href="/admin/productos/nuevo"
            />
            <QuickAction
              icon={Tag}
              title="Nueva Categoría"
              description="Crear categoría o subcategoría"
              href="/admin/categorias/nueva"
            />
            <QuickAction
              icon={Users}
              title="Nuevo Cliente"
              description="Registrar cliente mayorista"
              href="/admin/clientes/nuevo"
            />
            <QuickAction
              icon={BookOpen}
              title="Nueva Receta"
              description="Publicar receta con productos"
              href="/admin/recetas/nueva"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ stat }: { stat: typeof stats[0] }) {
  const Icon = stat.icon;
  const trendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = stat.trend === 'up' ? 'text-success' : 'text-destructive';

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-body-sm text-muted-foreground">{stat.name}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
          </div>
          <div className={cn('p-3 rounded-xl', `bg-${stat.color}/10 text-${stat.color}`)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        <div className={cn('flex items-center gap-1 mt-4', trendColor)}>
          <trendIcon className="h-4 w-4" />
          <span className="text-body-sm font-medium">{stat.change}</span>
          <span className="text-body-sm text-muted-foreground">vs mes anterior</span>
        </div>
      </CardContent>
    </Card>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' }> = {
    pending: { label: 'Pendiente', variant: 'warning' },
    confirmed: { label: 'Confirmado', variant: 'info' },
    processing: { label: 'Procesando', variant: 'primary' },
    shipped: { label: 'Enviado', variant: 'secondary' },
    delivered: { label: 'Entregado', variant: 'success' },
    cancelled: { label: 'Cancelado', variant: 'destructive' },
    refunded: { label: 'Reembolsado', variant: 'outline' },
  };

  const config = statusConfig[status] || { label: status, variant: 'default' };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function QuickAction({ icon: Icon, title, description, href }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-muted/50 transition-all duration-200"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-body-sm text-muted-foreground">{description}</p>
      </div>
    </a>
  );
}