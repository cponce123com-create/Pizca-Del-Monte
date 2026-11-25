import { GET, POST, PATCH, DELETE } from '@/app/api/cart/route';
import { prisma } from '@pizca/database';
import { auth } from '@/lib/auth/config';
import { mockCart, mockProducts, resetMocks } from '@/tests/setup';

// Mock NextRequest
function createMockRequest(method: string, body?: any, headers?: Record<string, string>) {
  const request = new Request('http://localhost:3000/api/cart', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
  return request;
}

describe('/api/cart', () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('returns cart with items for authenticated user', async () => {
      jest.mocked(prisma.cart.findUnique).mockResolvedValue(mockCart);
      jest.mocked(auth).mockResolvedValue({ user: { id: 'user_test_123' } });

      const request = createMockRequest('GET', undefined, { 'x-cart-id': 'cart_test_123' });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe('cart_test_123');
      expect(data.items).toHaveLength(1);
      expect(data.items[0].name).toBe('Ají Amarillo 200g');
      expect(data.items[0].quantity).toBe(2);
      expect(data.subtotal).toBe(51.00);
      expect(response.headers.get('x-cart-id')).toBe('cart_test_123');
    });

    it('returns cart for guest user using session cart ID', async () => {
      const guestCart = { ...mockCart, userId: null };
      jest.mocked(prisma.cart.findUnique).mockResolvedValue(guestCart);
      jest.mocked(auth).mockResolvedValue(null);

      const request = createMockRequest('GET', undefined, { 'x-cart-id': 'cart_test_123' });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe('cart_test_123');
    });

    it('returns 500 on database error', async () => {
      jest.mocked(prisma.cart.findUnique).mockRejectedValue(new Error('DB Error'));
      jest.mocked(auth).mockResolvedValue({ user: { id: 'user_test_123' } });

      const request = createMockRequest('GET');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Error interno del servidor');
    });
  });

  describe('POST', () => {
    it('adds item to cart for authenticated user', async () => {
      const variant = mockProducts[0].variants[0];
      jest.mocked(prisma.productVariant.findUnique).mockResolvedValue({
        ...variant,
        product: mockProducts[0],
      });
      jest.mocked(prisma.cart.findUnique).mockResolvedValue({ ...mockCart, items: [] });
      jest.mocked(prisma.cart.create).mockResolvedValue({ ...mockCart, items: [] });
      jest.mocked(prisma.cartItem.create).mockResolvedValue({});
      jest.mocked(prisma.cart.findUnique).mockResolvedValueOnce({ ...mockCart, items: [] })
        .mockResolvedValueOnce(mockCart);
      jest.mocked(auth).mockResolvedValue({ user: { id: 'user_test_123' } });

      const request = createMockRequest('POST', { variantId: 'var_test_1', quantity: 1 });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.items).toHaveLength(1);
    });

    it('returns 400 for invalid variant ID', async () => {
      jest.mocked(auth).mockResolvedValue({ user: { id: 'user_test_123' } });

      const request = createMockRequest('POST', { variantId: 'invalid-id', quantity: 1 });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Datos inválidos');
    });

    it('returns 404 for non-existent variant', async () => {
      jest.mocked(prisma.productVariant.findUnique).mockResolvedValue(null);
      jest.mocked(auth).mockResolvedValue({ user: { id: 'user_test_123' } });

      const request = createMockRequest('POST', { variantId: 'var_nonexistent', quantity: 1 });
      const response = await POST(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Producto no encontrado o no disponible');
    });

    it('returns 400 for insufficient stock', async () => {
      const variant = mockProducts[0].variants[0];
      jest.mocked(prisma.productVariant.findUnique).mockResolvedValue({
        ...variant,
        trackInventory: true,
        inventory: { availableQty: 1 },
        product: mockProducts[0],
      });
      jest.mocked(auth).mockResolvedValue({ user: { id: 'user_test_123' } });

      const request = createMockRequest('POST', { variantId: 'var_test_1', quantity: 5 });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Stock insuficiente');
    });
  });

  describe('PATCH', () => {
    it('updates item quantity', async () => {
      const cartWithItems = { ...mockCart, items: [{ ...mockCart.items[0], id: 'item_test_1' }] };
      jest.mocked(prisma.cart.findUnique).mockResolvedValue(cartWithItems);
      jest.mocked(prisma.cartItem.update).mockResolvedValue({});
      jest.mocked(prisma.cart.findUnique).mockResolvedValueOnce(cartWithItems).mockResolvedValueOnce(cartWithItems);
      jest.mocked(auth).mockResolvedValue({ user: { id: 'user_test_123' } });

      const request = createMockRequest('PATCH', { itemId: 'item_test_1', quantity: 3 });
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item_test_1' },
        data: { quantity: 3 },
      });
    });

    it('deletes item when quantity is 0', async () => {
      const cartWithItems = { ...mockCart, items: [{ ...mockCart.items[0], id: 'item_test_1' }] };
      jest.mocked(prisma.cart.findUnique).mockResolvedValue(cartWithItems);
      jest.mocked(prisma.cartItem.delete).mockResolvedValue({});
      jest.mocked(prisma.cart.findUnique).mockResolvedValueOnce(cartWithItems).mockResolvedValueOnce({ ...cartWithItems, items: [] });
      jest.mocked(auth).mockResolvedValue({ user: { id: 'user_test_123' } });

      const request = createMockRequest('PATCH', { itemId: 'item_test_1', quantity: 0 });
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(prisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: 'item_test_1' } });
    });

    it('returns 400 for invalid item ID', async () => {
      jest.mocked(auth).mockResolvedValue({ user: { id: 'user_test_123' } });

      const request = createMockRequest('PATCH', { itemId: 'invalid-id', quantity: 1 });
      const response = await PATCH(request);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE', () => {
    it('removes specific item from cart', async () => {
      const cartWithItems = { ...mockCart, items: [{ ...mockCart.items[0], id: 'item_test_1' }] };
      jest.mocked(prisma.cart.findUnique).mockResolvedValue(cartWithItems);
      jest.mocked(prisma.cartItem.delete).mockResolvedValue({});
      jest.mocked(prisma.cart.findUnique).mockResolvedValueOnce(cartWithItems).mockResolvedValueOnce({ ...cartWithItems, items: [] });
      jest.mocked(auth).mockResolvedValue({ user: { id: 'user_test_123' } });

      const request = createMockRequest('DELETE', { itemId: 'item_test_1' });
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      expect(prisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: 'item_test_1' } });
    });

    it('clears entire cart when no itemId provided', async () => {
      jest.mocked(prisma.cart.findUnique).mockResolvedValue(mockCart);
      jest.mocked(prisma.cartItem.deleteMany).mockResolvedValue({ count: 1 });
      jest.mocked(prisma.cart.findUnique).mockResolvedValueOnce(mockCart).mockResolvedValueOnce({ ...mockCart, items: [] });
      jest.mocked(auth).mockResolvedValue({ user: { id: 'user_test_123' } });

      const request = createMockRequest('DELETE', {});
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart_test_123' } });
    });
  });
});