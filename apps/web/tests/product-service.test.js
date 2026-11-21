import { getProduct, listProducts, productQuerySchema } from '../src/lib/products';
jest.mock('@pizca/database', () => ({ prisma: { product: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() } } }));
test('servicio compartido devuelve la ficha y el listado sin base en demo', async () => {
  process.env.DEMO_MODE = 'true';
  const params = productQuerySchema.parse({ search: 'charapita' });
  const list = await listProducts(params);
  const product = await getProduct('aji-charapita');
  expect(list.products[0].slug).toBe(product.slug);
  expect(await getProduct('no-existe')).toBeNull();
  delete process.env.DEMO_MODE;
});
test('metadata en demo usa el nombre real del fixture y bloquea indexación', async () => {
  process.env.DEMO_MODE = 'true';
  const { generateMetadata } = require('../src/app/(app)/producto/[slug]/page');
  const metadata = await generateMetadata({ params: Promise.resolve({ slug: 'aji-charapita' }) });
  expect(metadata.title).toBe('Ají Charapita');
  expect(metadata.robots).toEqual({ index: false, follow: false });
  expect(metadata.alternates.canonical).toBe('/producto/aji-charapita');
  delete process.env.DEMO_MODE;
});
