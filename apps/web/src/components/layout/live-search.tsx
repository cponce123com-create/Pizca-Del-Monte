'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Loader2, Search, X } from 'lucide-react';
import { DemoProductImage } from '@/components/products/demo-product-image';

type SearchProduct = {
  id: string;
  slug: string;
  name: string;
  formattedPrice: string;
  categories: { name: string }[];
  primaryImage: { url: string; alt: string } | null;
};
type SearchResponse = { products: SearchProduct[]; pagination: { total: number }; isDemo?: boolean };

export function LiveSearch({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const term = query.trim();

  useEffect(() => {
    inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onEscape);
    };
  }, [onClose]);

  useEffect(() => {
    setActiveIndex(-1);
    setProducts([]);
    setTotal(0);
    setError(false);
    if (!term) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search: term, limit: '6', sort: 'newest' });
        const response = await fetch('/api/products?' + params.toString(), {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('No se pudo buscar');
        const data: SearchResponse = await response.json();
        if (controller.signal.aborted) return;
        setProducts(data.products);
        setTotal(data.pagination.total);
        setIsDemo(Boolean(data.isDemo));
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  const navigate = (href: string) => {
    onClose();
    router.push(href);
  };
  const resultsHref = '/tienda?search=' + encodeURIComponent(term);
  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && products.length) {
      event.preventDefault();
      setActiveIndex(index => (index + 1) % products.length);
    } else if (event.key === 'ArrowUp' && products.length) {
      event.preventDefault();
      setActiveIndex(index => (index - 1 + products.length) % products.length);
    } else if (event.key === 'Enter' && term) {
      event.preventDefault();
      navigate(activeIndex >= 0 && products[activeIndex]
        ? '/producto/' + products[activeIndex].slug : resultsHref);
    }
  };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/60 px-3 pt-16 sm:pt-24"
      role="presentation"
      onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section role="dialog" aria-modal="true" aria-label="Buscar productos" className="w-full max-w-2xl overflow-hidden rounded-2xl bg-background shadow-2xl">
        <div className="flex items-center gap-3 border-b p-4">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            maxLength={120}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Busca desde la primera letra: ají, sal, especias..."
            className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none"
            aria-label="Buscar productos del catálogo"
            role="combobox"
            aria-autocomplete="list"
            aria-controls="pizca-live-results"
            aria-expanded={products.length > 0}
            aria-activedescendant={activeIndex >= 0 ? 'pizca-live-option-' + activeIndex : undefined}
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" aria-label="Buscando" />}
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-muted" aria-label="Cerrar buscador"><X className="h-5 w-5" /></button>
        </div>
        <div id="pizca-live-results" role="listbox" aria-label="Productos encontrados" className="max-h-[65vh] overflow-y-auto">
          {!term && <p className="p-6 text-sm text-muted-foreground">Escribe una letra para ver sugerencias del catálogo.</p>}
          {term && loading && <p role="status" className="p-6 text-sm text-muted-foreground">Buscando productos…</p>}
          {term && !loading && error && <p role="alert" className="p-6 text-sm text-destructive">No pudimos cargar resultados. Intenta nuevamente.</p>}
          {term && !loading && !error && products.length === 0 && <p role="status" className="p-6 text-sm text-muted-foreground">No hay productos que coincidan con «{term}».</p>}
          {term && !loading && !error && products.map((product, index) => (
            <a
              key={product.id}
              id={'pizca-live-option-' + index}
              href={'/producto/' + product.slug}
              role="option"
              aria-selected={activeIndex === index}
              className={'flex items-center gap-4 border-b px-4 py-3 transition-colors hover:bg-muted ' + (activeIndex === index ? 'bg-muted' : '')}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={event => { event.preventDefault(); navigate('/producto/' + product.slug); }}
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                <DemoProductImage name={product.name} category={product.categories[0]?.name ?? ''} src={product.primaryImage?.url} alt={product.primaryImage?.alt} />
              </div>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm">{product.name}</strong>
                <span className="text-xs text-muted-foreground">{product.categories[0]?.name ?? 'Producto'}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold">{product.formattedPrice}</span>
            </a>
          ))}
          {term && !loading && !error && products.length > 0 && (
            <button type="button" className="w-full px-4 py-4 text-center text-sm font-semibold text-primary hover:bg-muted" onClick={() => navigate(resultsHref)}>
              Ver todos los resultados ({total})
            </button>
          )}
          {term && !loading && !error && isDemo && <p className="border-t px-4 py-2 text-xs text-muted-foreground">Precios referenciales. Tienda en demostración.</p>}
        </div>
      </section>
    </div>,
    document.body
  );
}
