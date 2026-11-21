/** @jest-environment jsdom */
import { addDemoCartItem, readDemoCart, writeDemoCart, DEMO_CART_KEY } from '../src/lib/demo-cart';

beforeEach(() => localStorage.clear());
test('conserva productos y cantidades en el navegador y permite quitarlos', () => {
  addDemoCartItem('aji-charapita', 2);
  addDemoCartItem('aji-charapita', 1);
  addDemoCartItem('sal-ahumada', 1);
  expect(readDemoCart()).toEqual([{ slug: 'aji-charapita', quantity: 3 }, { slug: 'sal-ahumada', quantity: 1 }]);
  writeDemoCart(readDemoCart().filter(item => item.slug !== 'aji-charapita'));
  expect(readDemoCart()).toEqual([{ slug: 'sal-ahumada', quantity: 1 }]);
});
test('limita cantidades y tolera datos inválidos en el navegador', () => {
  localStorage.setItem(DEMO_CART_KEY, '{');
  expect(readDemoCart()).toEqual([]);
  addDemoCartItem('aji-charapita', 200);
  expect(readDemoCart()[0].quantity).toBe(99);
});
