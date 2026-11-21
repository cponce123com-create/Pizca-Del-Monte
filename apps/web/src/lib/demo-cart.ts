export const DEMO_CART_KEY = 'pizca-demo-cart-v1';
export type DemoCartItem = { slug: string; quantity: number };
export function readDemoCart(): DemoCartItem[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(DEMO_CART_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter(item => item && typeof item.slug === 'string' && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99);
  } catch { return []; }
}
export function writeDemoCart(items: DemoCartItem[]) {
  localStorage.setItem(DEMO_CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('pizca-demo-cart-change'));
}
export function addDemoCartItem(slug: string, quantity: number) {
  const items = readDemoCart();
  const item = items.find(entry => entry.slug === slug);
  const safeQuantity = Math.max(1, Math.min(99, Math.trunc(quantity) || 1));
  if (item) item.quantity = Math.min(99, item.quantity + safeQuantity);
  else items.push({ slug, quantity: safeQuantity });
  writeDemoCart(items);
}
