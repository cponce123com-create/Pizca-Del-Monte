'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  BarChart3,
  CreditCard,
  Truck,
  FileText,
  Tag,
  Layers,
  BookOpen,
  Gift,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  User,
  Bell,
  Search,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Productos', href: '/admin/productos', icon: Package },
  { name: 'Categorías', href: '/admin/categorias', icon: Tag },
  { name: 'Marcas', href: '/admin/marcas', icon: Layers },
  { name: 'Colecciones', href: '/admin/colecciones', icon: Gift },
  { name: 'Pedidos', href: '/admin/pedidos', icon: ShoppingCart },
  { name: 'Clientes', href: '/admin/clientes', icon: Users },
  { name: 'Recetas', href: '/admin/recetas', icon: BookOpen },
  { name: 'Envíos', href: '/admin/envios', icon: Truck },
  { name: 'Facturación', href: '/admin/facturacion', icon: FileText },
  { name: 'Pagos', href: '/admin/pagos', icon: CreditCard },
  { name: 'Devoluciones', href: '/admin/devoluciones', icon: RotateCcw },
  { name: 'Cupones', href: '/admin/cupones', icon: Tag },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Configuración', href: '/admin/configuracion', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-border bg-background transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        aria-label="Navegación principal"
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <Link href="/admin" className="flex items-center gap-2" aria-label="Dashboard">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <span className="text-primary-foreground font-heading font-bold text-xl">P</span>
            </div>
            {!sidebarCollapsed && (
              <span className="font-heading font-semibold text-heading-sm text-foreground">
                Pizca Admin
              </span>
            )}
          </Link>
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Menú de administración">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  sidebarCollapsed && 'justify-center'
                )}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="p-4 border-t border-border">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-body-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
              sidebarCollapsed && 'justify-end'
            )}
            aria-label={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? (
              <>
                <ChevronRight className="h-5 w-5" />
                <span className="hidden">Expandir</span>
              </>
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span>Colapsar</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content */}
      <div className={cn('flex-1 flex flex-col overflow-hidden', sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64')}>
        {/* Top Bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between px-4 sm:px-6 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={sidebarOpen}
            aria-controls="sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Buscar..."
                className="w-64 pl-10 pr-4 py-2 text-body-sm border-border bg-muted rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <button className="relative p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Notificaciones">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium">
                3
              </span>
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="hidden sm:block text-right">
                <p className="text-body-sm font-medium text-foreground">Admin User</p>
                <p className="text-body-xs text-muted-foreground">Superadmin</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}