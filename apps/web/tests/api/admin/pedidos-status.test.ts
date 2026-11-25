import { PATCH } from '@/app/api/admin/pedidos/[id]/route';
import { prisma } from '@pizca/database';
import { NextRequest } from 'next/server';

// Mock Prisma
jest.mock('@pizca/database', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    orderStatusHistory: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    productVariant: {
      update: jest.fn(),
    },
    product: {
      update: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(prisma)),
  },
}));

// Mock requireAdmin
jest.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: jest.fn().mockResolvedValue({ id: 'admin-123', email: 'admin@test.com' }),
}));

describe('Admin Order Status Update API', () => {
  const mockOrder = {
    id: 'order-123',
    orderNumber: 'PDM-240115-ABC123',
    status: 'PAYMENT_CONFIRMED',
    confirmedAt: new Date('2024-01-15T10:05:00Z'),
    shippedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    internalNotes: '',
    items: [
      { id: 'item-1', productId: 'prod-1', variantId: 'var-1', quantity: 2 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
    (prisma.order.update as jest.Mock).mockResolvedValue({
      ...mockOrder,
      status: 'PREPARING',
    });
    (prisma.orderStatusHistory.create as jest.Mock).mockResolvedValue({});
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
    (prisma.productVariant.update as jest.Mock).mockResolvedValue({});
    (prisma.product.update as jest.Mock).mockResolvedValue({});
    (prisma.stockMovement.create as jest.Mock).mockResolvedValue({});
  });

  const createRequest = (body: any) => {
    return new NextRequest('http://localhost/api/admin/pedidos/order-123', {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  };

  it('should update order status successfully', async () => {
    const req = createRequest({ status: 'PREPARING', note: 'Iniciando preparación' });
    const response = await PATCH(req, { params: Promise.resolve({ id: 'order-123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.order.status).toBe('PREPARING');
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-123' },
        data: expect.objectContaining({
          status: 'PREPARING',
          internalNotes: expect.stringContaining('Iniciando preparación'),
        }),
      })
    );
    expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: 'order-123',
          fromStatus: 'PAYMENT_CONFIRMED',
          toStatus: 'PREPARING',
          reason: 'Iniciando preparación',
          createdBy: 'admin-123',
        }),
      })
    );
  });

  it('should reject invalid status', async () => {
    const req = createRequest({ status: 'INVALID_STATUS' });
    const response = await PATCH(req, { params: Promise.resolve({ id: 'order-123' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Datos inválidos');
  });

  it('should reject missing status', async () => {
    const req = createRequest({ note: 'Solo nota' });
    const response = await PATCH(req, { params: Promise.resolve({ id: 'order-123' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Datos inválidos');
  });

  it('should reject same status', async () => {
    const req = createRequest({ status: 'PAYMENT_CONFIRMED' });
    const response = await PATCH(req, { params: Promise.resolve({ id: 'order-123' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('El pedido ya tiene ese estado');
  });

  it('should reject invalid state transition (DELIVERED from PAYMENT_CONFIRMED)', async () => {
    const req = createRequest({ status: 'DELIVERED' });
    const response = await PATCH(req, { params: Promise.resolve({ id: 'order-123' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('No se puede cambiar');
  });

  it('should reject invalid state transition (REFUNDED from PENDING_PAYMENT)', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValueOnce({
      ...mockOrder,
      status: 'PENDING_PAYMENT',
    });

    const req = createRequest({ status: 'REFUNDED' });
    const response = await PATCH(req, { params: Promise.resolve({ id: 'order-123' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('No se puede cambiar');
  });

  it('should reject invalid state transition (CANCELLED from DELIVERED)', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValueOnce({
      ...mockOrder,
      status: 'DELIVERED',
    });

    const req = createRequest({ status: 'CANCELLED' });
    const response = await PATCH(req, { params: Promise.resolve({ id: 'order-123' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('No se puede cambiar');
  });

  it('should restore inventory on cancellation', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValueOnce({
      ...mockOrder,
      status: 'PAYMENT_CONFIRMED',
      items: [
        { id: 'item-1', productId: 'prod-1', variantId: 'var-1', quantity: 2 },
      ],
    });

    const req = createRequest({ status: 'CANCELLED', note: 'Cliente canceló' });
    const response = await PATCH(req, { params: Promise.resolve({ id: 'order-123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.productVariant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'var-1' },
        data: expect.objectContaining({
          inventory: expect.objectContaining({
            update: expect.objectContaining({
              quantity: { increment: 2 },
              availableQty: { increment: 2 },
            }),
          }),
        }),
      })
    );
    expect(prisma.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'RETURN',
          quantity: 2,
          referenceType: 'order_cancellation',
          performedBy: 'admin-123',
        }),
      })
    );
  });

  it('should set timestamps on status change', async () => {
    const req = createRequest({ status: 'SHIPPED' });
    const response = await PATCH(req, { params: Promise.resolve({ id: 'order-123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shippedAt: expect.any(Date),
        }),
      })
    );
  });

  it('should set cancelledAt and cancelledReason on cancellation', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValueOnce({
      ...mockOrder,
      status: 'PAYMENT_CONFIRMED',
    });

    const req = createRequest({ status: 'CANCELLED', note: 'Sin stock' });
    const response = await PATCH(req, { params: Promise.resolve({ id: 'order-123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cancelledAt: expect.any(Date),
          cancelledReason: 'Sin stock',
        }),
      })
    );
  });

  it('should return 404 for non-existent order', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const req = createRequest({ status: 'PREPARING' });
    const response = await PATCH(req, { params: Promise.resolve({ id: 'non-existent' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Pedido no encontrado');
  });

  it('should handle order with no variant (simple product)', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValueOnce({
      ...mockOrder,
      status: 'PAYMENT_CONFIRMED',
      items: [
        { id: 'item-1', productId: 'prod-1', variantId: null, quantity: 1 },
      ],
    });

    const req = createRequest({ status: 'CANCELLED' });
    const response = await PATCH(req, { params: Promise.resolve({ id: 'order-123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'prod-1' },
        data: expect.objectContaining({
          inventory: expect.objectContaining({
            update: expect.objectContaining({
              quantity: { increment: 1 },
              availableQty: { increment: 1 },
            }),
          }),
        }),
      })
    );
  });
});