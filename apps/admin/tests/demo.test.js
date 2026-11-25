const { initialDemo, saveRecord } = require('../src/lib/demo/store');
const { code39Image } = require('../src/lib/demo/barcode');

const now = new Date('2026-11-25T12:00:00Z');
const save = (store, module, value) => saveRecord(store, module, value, now, 'audit-' + store.audit.length);

test('los productos iniciales salen del catálogo demo y el SKU es único', () => {
  const store = initialDemo();
  expect(store.products.length).toBeGreaterThan(0);
  expect(() => save(store, 'products', { ...store.products[0], id: 'duplicate' })).toThrow(/Ya existe/);
});

test('confirmar descuenta inventario una vez, cancelar lo repone y registra la actividad', () => {
  let store = save(initialDemo(), 'customers', { id: 'customer', name: 'Prueba', email: 'test@example.com', type: 'Minorista' });
  const product = store.products[0].id;
  const original = Number(store.inventory[0].quantity);
  const order = { id: 'order', name: 'D-001', customer: 'customer', product, quantity: '2', status: 'Pendiente' };
  store = save(store, 'orders', order);
  expect(() => save(store, 'orders', { ...order, status: 'Enviado' })).toThrow(/estado/);
  store = save(store, 'orders', { ...order, status: 'Confirmado' });
  store = save(store, 'orders', { ...order, status: 'Confirmado' });
  expect(Number(store.inventory[0].quantity)).toBe(original - 2);
  store = save(store, 'orders', { ...order, status: 'Cancelado' });
  expect(Number(store.inventory[0].quantity)).toBe(original);
  expect(store.audit[0].name).toBe('Editar · Pedidos');
});

test('protege la cuenta demo y valida los códigos de barras', () => {
  const store = initialDemo();
  expect(() => save(store, 'users', store.users[0])).toThrow(/protegido/);
  expect(code39Image('DEMO-001')).toMatch(/^data:image\/svg\+xml,/);
  expect(() => code39Image('<svg>')).toThrow(/SKU/);
});
