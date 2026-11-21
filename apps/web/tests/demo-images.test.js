import { existsSync } from 'fs';
import path from 'path';
import { demoProducts } from '../src/lib/demo-products';
test('los 30 productos tienen imágenes locales y datos referenciales completos', () => {
  expect(demoProducts).toHaveLength(30);
  for (const product of demoProducts) {
    expect(product.shortDescription.length).toBeGreaterThan(10);
    expect(product.presentation).toBeTruthy(); expect(product.origin).toBeTruthy();
    expect(product.primaryImage.url).toMatch(/^\/demo\/.*\.webp$/);
    expect(existsSync(path.join(process.cwd(), 'public', product.primaryImage.url))).toBe(true);
  }
  expect(new Set(demoProducts.map(product => product.shortDescription)).size).toBe(30);
});
