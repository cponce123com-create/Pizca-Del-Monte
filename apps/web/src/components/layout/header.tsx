'use client';
import { logger } from '@/lib/logger';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Menu, X, Search, ShoppingCart, User, Heart, Truck, RotateCcw, Shield, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { readDemoCart } from '@/lib/demo-cart';

const navigation = [
  { name: 'Inicio', href: '/' },
  { name: 'Tienda', href: '/tienda' },
  { name: 'Ofertas', href: '/ofertas' },
  { name: 'Packs', href: '/packs' },
  { name: 'Recetas', href: '/recetas' },
];

const dropdownItems = [
  { name: 'Especias', href: '/tienda/categoria/especias', description: 'Ajíes, hierbas, semillas y mezclas' },
  { name: 'Sales Gourmet', href: '/tienda/categoria/sales-gourmet', description: 'Maras, aromatizadas y de origen' },
  { name: 'Aceites y Vinagres', href: '/tienda/categoria/aceites-vinagres', description: 'AOVE, infusionados y artesanales' },
  { name: 'Mezclas y Salsas', href: '/tienda/categoria/mezclas-salsas', description: 'Huancaína, ocopa, aderezos' },
  { name: 'Packs Gourmet', href: '/tienda/categoria/packs-gourmet', description: 'Regalos curados y temáticos' },
  { name: 'Accesorios', href: '/tienda/categoria/accesorios', description: 'Morteros, molinillos, frascos' },
];

// Componente para el contador del carrito que obtiene los datos dinámicamente
function CartCount({ isDemo }: { isDemo: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCartCount = async () => {
      if (isDemo) { setCount(readDemoCart().reduce((sum, item) => sum + item.quantity, 0)); return; }
      try {
        const response = await fetch('/api/cart');
        if (response.ok) {
          const data = await response.json();
          setCount(data.itemCount || 0);
        }
      } catch (error) {
        logger.error('Error fetching cart count:', error);
      }
    };

    fetchCartCount();
    window.addEventListener('pizca-demo-cart-change', fetchCartCount);
    window.addEventListener('storage', fetchCartCount);
    return () => { window.removeEventListener('pizca-demo-cart-change', fetchCartCount); window.removeEventListener('storage', fetchCartCount); };
  }, [isDemo]);

  if (count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function Header({ isDemo = false }: { isDemo?: boolean }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const visibleNavigation = isDemo ? navigation.filter(item => item.href !== '/ofertas') : navigation;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();

  const handleNavigate = (href: string) => {
    router.push(href);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-[300] w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Top Bar */}
      <div className="hidden md:flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border text-body-xs">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Truck className="h-3.5 w-3.5" />
            Envíos sujetos a cobertura y confirmación
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            Consulta los medios de pago disponibles
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" />
            Consulta las condiciones de devolución
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => { e.preventDefault(); handleNavigate('/login'); }}>
            Iniciar sesión
          </Link>
          <Link href="/register" className="text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => { e.preventDefault(); handleNavigate('/register'); }}>
            Registrarse
          </Link>
          <Link href="/mi-cuenta" className="text-primary hover:text-primary-light transition-colors font-medium" onClick={(e) => { e.preventDefault(); handleNavigate('/mi-cuenta'); }}>
            Mi cuenta
          </Link>
        </div>
      </div>

      {/* Main Header */}
      <nav className="container mx-auto px-4" aria-label="Navegación principal">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2" aria-label="Pizca del Monte - Inicio" onClick={(e) => { e.preventDefault(); handleNavigate('/'); }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <span className="text-primary-foreground font-heading font-bold text-xl">P</span>
            </div>
            <span className="hidden sm:block font-heading font-semibold text-heading-sm text-foreground">
              Pizca del Monte
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-1">
            {visibleNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="px-4 py-2 text-body-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg"
                onClick={(e) => { e.preventDefault(); handleNavigate(item.href); }}
              >
                {item.name}
              </Link>
            ))}
            {/* Categorías Dropdown */}
            <div className="relative">
              <button
                className="flex items-center gap-1.5 px-4 py-2 text-body-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg"
                onMouseEnter={() => setDropdownOpen(true)}
                onMouseLeave={() => setDropdownOpen(false)}
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                Categorías
                <ChevronDown className="h-4 w-4" />
              </button>
              {dropdownOpen && (
                <div
                  className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border bg-background p-2 shadow-dropdown"
                  onMouseEnter={() => setDropdownOpen(true)}
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  {dropdownItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-lg text-body-sm hover:bg-muted transition-colors"
                      onClick={(e) => { e.preventDefault(); handleNavigate(item.href); }}
                    >
                      <span className="font-medium text-foreground">{item.name}</span>
                      <span className="text-muted-foreground">{item.description}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} aria-label="Buscar productos"><Search className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" className="relative" onClick={() => handleNavigate('/favoritos')} aria-label="Favoritos">
              <Heart className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="relative" onClick={() => handleNavigate('/carrito')} aria-label="Carrito">
              <ShoppingCart className="h-5 w-5" />
              <CartCount isDemo={isDemo} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleNavigate('/mi-cuenta')} aria-label="Mi cuenta">
              <User className="h-5 w-5" />
            </Button>
            <Button variant="primary" size="sm" className="hidden sm:flex" onClick={() => handleNavigate('/tienda')}>
              Comprar
            </Button>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden py-4 border-t border-border animate-slide-in-from-top">
            <div className="flex flex-col gap-2">
              {visibleNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="px-3 py-2 text-body-md font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  onClick={(e) => { e.preventDefault(); handleNavigate(item.href); }}
                >
                  {item.name}
                </Link>
              ))}
              <hr className="border-border my-2" />
              <div className="px-3 py-2">
                <h3 className="font-semibold text-foreground mb-2">Categorías</h3>
                <div className="flex flex-col gap-1">
                  {dropdownItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="px-3 py-2 text-body-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                      onClick={(e) => { e.preventDefault(); handleNavigate(item.href); }}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Modal */}
        {searchOpen && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 bg-black/50 animate-fade-in"
            onClick={() => setSearchOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Buscar productos"
          >
            <div
              className="w-full max-w-2xl mx-4 bg-background rounded-xl shadow-xl overflow-hidden animate-zoom-in"
              onClick={(e) => e.stopPropagation()}
            >
              <form className="p-4 border-b border-border" onSubmit={(event) => { event.preventDefault(); const term = searchTerm.trim(); setSearchOpen(false); handleNavigate(term ? `/tienda?search=${encodeURIComponent(term)}` : '/tienda'); }}>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="search"
                    aria-label="Buscar productos"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar productos, recetas, marcas..."
                    className="w-full pl-12 pr-4 py-3 text-body-lg border-border bg-muted rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <Button type="submit" className="mt-3">Buscar</Button>
              </form>
              <div className="p-4">
                <p className="text-body-sm text-muted-foreground mb-4">Categorías populares</p>
                <div className="flex flex-wrap gap-2">
                  {['Ají Amarillo', 'Sal de Maras', 'Aceite de Oliva', 'Packs Regalo', 'Salsa Huancaína', 'Vinagre de Manzana'].map((cat) => (
                    <Button key={cat} variant="outline" size="sm" className="gap-1" onClick={() => { handleNavigate(`/tienda?search=${encodeURIComponent(cat)}`); setSearchOpen(false); }}>
                      <Search className="h-3.5 w-3.5" />
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}