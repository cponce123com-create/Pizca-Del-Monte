import { NextRequest } from 'next/server';
import { POST, PATCH, DELETE } from '../src/app/api/cart/route';
import { prisma } from '@pizca/database';

jest.mock('@/lib/auth/config', () => ({ auth: jest.fn().mockResolvedValue(null) }));
jest.mock('@pizca/database', () => ({ prisma: {
  productVariant: { findUnique: jest.fn() },
  cart: { findUnique: jest.fn() },
  cartItem: { create: jest.fn(), update: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
} }));

const id = 'cl12345678901234567890123';
const variantId = 'cl12345678901234567890124';
const itemId = 'cl12345678901234567890125';
const decimal = (value) => ({ toNumber: () => value });
const product = { id, name: 'Ají', slug: 'aji', basePrice: decimal(12), media: [], brand: null };
const variant = { id: variantId, productId: id, sku: 'AJI', name: 'Ají', price: decimal(12), trackInventory: true, inventory: { availableQty: 5 }, attributes: [], product: { ...product, status: 'ACTIVE' } };
const item = { id: itemId, productId: id, variantId, quantity: 1, product, variant };
const cart = { id, userId: null, items: [item], expiresAt: null };
const request = (method, body) => new NextRequest('http://localhost/api/cart', { method, headers: { 'content-type': 'application/json', 'x-cart-id': id }, body: JSON.stringify(body) });

beforeEach(() => {
  jest.clearAllMocks();
  prisma.cart.findUnique.mockResolvedValue(cart);
  prisma.productVariant.findUnique.mockResolvedValue(variant);
});

test('agregar, cambiar y eliminar responden con los datos completos del carrito', async () => {
  const added = await POST(request('POST', { variantId, quantity: 1 }));
  expect(added.status).toBe(201);
  expect((await added.json()).items[0].name).toBe('Ají');
  expect(prisma.cart.findUnique).toHaveBeenLastCalledWith(expect.objectContaining({ include: expect.objectContaining({ items: expect.objectContaining({ include: expect.objectContaining({ product: expect.any(Object) }) }) }) }));
  const changed = await PATCH(request('PATCH', { itemId, quantity: 2 }));
  expect(changed.status).toBe(200);
  const removed = await DELETE(request('DELETE', { itemId }));
  expect(removed.status).toBe(200);
});

test('un producto con inventario controlado sin registro no se agrega', async () => {
  prisma.productVariant.findUnique.mockResolvedValue({ ...variant, inventory: null });
  const response = await POST(request('POST', { variantId, quantity: 1 }));
  expect(response.status).toBe(400);
  expect(prisma.cartItem.create).not.toHaveBeenCalled();
});

test('un identificador inválido no vacía el carrito', async () => {
  const response = await DELETE(request('DELETE', { itemId: 'inválido' }));
  expect(response.status).toBe(400);
  expect(prisma.cartItem.deleteMany).not.toHaveBeenCalled();
});
