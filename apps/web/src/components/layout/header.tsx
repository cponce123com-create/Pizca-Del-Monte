'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu, X, Search, ShoppingCart, User, Heart, Truck, RotateCcw, Shield, ChevronDown, Leaf } from 'lucide-react';
import { readDemoCart } from '@/lib/demo-cart';
import { LiveSearch } from '@/components/layout/live-search';

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
  { name: 'Mezclas y Salsas', href: '/tienda/categoria/mezclas-salsas', description: 'Aderezos y picantes peruanos' },
  { name: 'Packs Gourmet', href: '/tienda/categoria/packs-gourmet', description: 'Regalos curados y temáticos' },
  { name: 'Accesorios', href: '/tienda/categoria/accesorios', description: 'Morteros, molinillos, frascos' },
];

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
        console.error('Error fetching cart count:', error);
      }
    };

    fetchCartCount();
    window.addEventListener('pizca-demo-cart-change', fetchCartCount);
    window.addEventListener('storage', fetchCartCount);
    return () => { window.removeEventListener('pizca-demo-cart-change', fetchCartCount); window.removeEventListener('storage', fetchCartCount); };
  }, [isDemo]);

  if (count === 0) return null;
  return <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-terracotta-700 px-1 text-[10px] font-semibold text-white shadow-sm">{count > 99 ? '99+' : count}</span>;
}

function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
        <Leaf className="h-5 w-5" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-heading text-lg font-semibold tracking-tight text-foreground">Pizca</span>
        <span className="font-heading text-sm italic text-primary">del Monte</span>
      </span>
    </span>
  );
}

export function Header({ isDemo = false }: { isDemo?: boolean }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();

  const handleNavigate = (href: string) => {
    router.push(href);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-[300] w-full border-b border-border/80 bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="bg-primary px-4 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-primary-foreground/90">
        <div className="container flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> Envíos sujetos a cobertura y confirmación</span>
          <span className="hidden items-center gap-1.5 sm:inline-flex"><Shield className="h-3.5 w-3.5" /> Catálogo demo · precios referenciales</span>
        </div>
      </div>

      <nav className="container" aria-label="Navegación principal">
        <div className="flex h-[4.5rem] items-center justify-between gap-4">
          <Link href="/" className="shrink-0" aria-label="Pizca del Monte - Inicio" onClick={(e) => { e.preventDefault(); handleNavigate('/'); }}><Brand /></Link>

          <div className="hidden items-center gap-0.5 lg:flex">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href} className="rounded-full px-3.5 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-primary/8 hover:text-primary" onClick={(e) => { e.preventDefault(); handleNavigate(item.href); }}>
                {item.name}
              </Link>
            ))}
            <div className="relative ml-1" onMouseEnter={() => setDropdownOpen(true)} onMouseLeave={() => setDropdownOpen(false)}>
              <button className="flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-primary/8 hover:text-primary" aria-haspopup="true" aria-expanded={dropdownOpen}>
                Categorías <ChevronDown className="h-4 w-4" />
              </button>
              {dropdownOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-2xl border border-border bg-background p-2 shadow-dropdown" role="menu">
                  <div className="px-3 pb-2 pt-2"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Explora la despensa</p></div>
                  {dropdownItems.map((item) => (
                    <Link key={item.name} href={item.href} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-ivory-100" onClick={(e) => { e.preventDefault(); handleNavigate(item.href); }}>
                      <span className="font-medium text-foreground">{item.name}</span><span className="text-right text-xs text-foreground-muted">{item.description}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} aria-label="Buscar productos" aria-haspopup="dialog"><Search className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" className="relative" onClick={() => handleNavigate('/favoritos')} aria-label="Favoritos"><Heart className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" className="relative" onClick={() => handleNavigate('/carrito')} aria-label="Carrito"><ShoppingCart className="h-5 w-5" /><CartCount isDemo={isDemo} /></Button>
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex" onClick={() => handleNavigate('/mi-cuenta')} aria-label="Mi cuenta"><User className="h-5 w-5" /></Button>
            <Button variant="primary" size="sm" className="hidden rounded-full px-5 sm:flex" onClick={() => handleNavigate('/tienda')}>Comprar</Button>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-expanded={mobileMenuOpen} aria-controls="mobile-menu" aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}>{mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div id="mobile-menu" className="border-t border-border py-4 lg:hidden" role="dialog" aria-label="Menú móvil">
            <div className="grid gap-1">
              {navigation.map((item) => <Link key={item.name} href={item.href} className="rounded-xl px-3 py-2.5 text-sm font-medium text-foreground-muted hover:bg-ivory-100 hover:text-primary" onClick={(e) => { e.preventDefault(); handleNavigate(item.href); }}>{item.name}</Link>)}
              <div className="mt-2 border-t border-border pt-3"><p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Categorías</p>{dropdownItems.map((item) => <Link key={item.name} href={item.href} className="block rounded-xl px-3 py-2 text-sm text-foreground-muted hover:bg-ivory-100 hover:text-primary" onClick={(e) => { e.preventDefault(); handleNavigate(item.href); }}>{item.name}</Link>)}</div>
            </div>
          </div>
        )}
        {searchOpen && <LiveSearch onClose={() => setSearchOpen(false)} />}
      </nav>
    </header>
  );
}
