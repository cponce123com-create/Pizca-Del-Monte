import { NextRequest } from 'next/server';
import { GET as list } from '../src/app/api/products/route';
import { GET as detail } from '../src/app/api/products/[slug]/route';
import { isDemoMode } from '../src/lib/demo-mode';
import { demoProducts } from '../src/lib/demo-products';

jest.mock('@pizca/database', () => ({ prisma: { product: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() } } }));
const request = (query = '') => new NextRequest(`http://localhost/api/products${query}`);
beforeEach(() => { delete process.env.DATABASE_URL; delete process.env.DEMO_MODE; });

test('sin base de datos entrega 30 productos paginados y fichas reales de demostración', async () => {
  expect(isDemoMode()).toBe(true);
  expect(demoProducts).toHaveLength(30);
  const response = await list(request('?limit=100'));
  const data = await response.json();
  expect(response.status).toBe(200);
  expect(data.isDemo).toBe(true);
  expect(data.pagination.total).toBe(30);
  expect(new Set(data.products.map(p => p.slug)).size).toBe(30);
  const product = await detail(request(), { params: Promise.resolve({ slug: data.products[0].slug }) });
  expect((await product.json()).isDemo).toBe(true);
  expect((await detail(request(), { params: Promise.resolve({ slug: 'no-existe' }) })).status).toBe(404);
});

test('búsqueda, categorías y orden se aplican en modo demo', async () => {
  const result = await (await list(request('?category=sales-gourmet&sort=price_asc&limit=100'))).json();
  expect(result.pagination.total).toBe(5);
  expect(result.products.every(p => p.categories[0].slug === 'sales-gourmet')).toBe(true);
  expect(result.products.map(p => p.basePrice)).toEqual([...result.products.map(p => p.basePrice)].sort((a, b) => a - b));
  const search = await (await list(request('?search=charapita'))).json();
  expect(search.products[0].slug).toBe('aji-charapita');
});

test('no se muestra demo automáticamente al configurar una base', () => {
  process.env.DATABASE_URL = 'postgresql://example';
  expect(isDemoMode()).toBe(false);
  process.env.DEMO_MODE = 'true';
  expect(isDemoMode()).toBe(true);
});
