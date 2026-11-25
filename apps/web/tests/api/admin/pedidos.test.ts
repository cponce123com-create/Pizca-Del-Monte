import { GET } from '@/app/api/admin/pedidos/route';
import { prisma } from '@pizca/database';
import { NextRequest } from 'next/server';

// Mock Prisma
jest.mock('@pizca/database', () => ({
  prisma: {
    order: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Mock requireAdmin
jest.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: jest.fn().mockResolvedValue({ id: 'admin-123', email: 'admin@test.com' }),
}));

describe('Admin Orders API', () => {
  const mockOrders = [
    {
      id: 'order-1',
      orderNumber: 'PDM-240115-ABC123',
      userId: 'user-1',
      guestEmail: null,
      status: 'PAYMENT_CONFIRMED',
      currency: 'PEN',
      subtotal: 200.00,
      discountAmount: 10.00,
      shippingAmount: 15.00,
      taxAmount: 36.90,
      total: 241.90,
      paidAmount: 241.90,
      balanceDue: 0,
      paymentMethod: 'MERCADO_PAGO',
      paymentReference: 'MP-12345',
      shippingMethod: 'standard',
      shippingCarrier: 'Shalom',
      shippingTracking: 'SHL123456',
      estimatedDelivery: new Date('2024-01-20'),
      documentType: 'INVOICE',
      documentSeries: 'F001',
      documentNumber: '1',
      documentSunatStatus: 'ACEPTADO',
      createdAt: new Date('2024-01-15T10:00:00Z'),
      confirmedAt: new Date('2024-01-15T10:05:00Z'),
      shippedAt: null,
      deliveredAt: null,
      user: { id: 'user-1', name: 'Juan Pérez', email: 'juan@test.com' },
      Customer: null,
      items: [
        { id: 'item-1', name: 'Producto Test', quantity: 2, unitPrice: 100.00, total: 200.00 },
      ],
      payments: [
        { id: 'pay-1', amount: 241.90, status: 'APPROVED', provider: 'mercadopago', createdAt: new Date('2024-01-15T10:05:00Z') },
      ],
      shipments: [],
      documents: [
        { id: 'doc-1', type: 'INVOICE', series: 'F001', number: 1, sunatStatus: 'ACEPTADO', pdfUrl: 'https://example.com/pdf' },
      ],
    },
    {
      id: 'order-2',
      orderNumber: 'PDM-240116-DEF456',
      userId: null,
      guestEmail: 'guest@test.com',
      status: 'PENDING_PAYMENT',
      currency: 'PEN',
      subtotal: 150.00,
      discountAmount: 0,
      shippingAmount: 10.00,
      taxAmount: 27.00,
      total: 187.00,
      paidAmount: 0,
      balanceDue: 187.00,
      paymentMethod: null,
      paymentReference: null,
      shippingMethod: null,
      shippingCarrier: null,
      shippingTracking: null,
      estimatedDelivery: null,
      documentType: null,
      documentSeries: null,
      documentNumber: null,
      documentSunatStatus: null,
      createdAt: new Date('2024-01-16T14:00:00Z'),
      confirmedAt: null,
      shippedAt: null,
      deliveredAt: null,
      user: null,
      Customer: { id: 'cust-1', firstName: 'María', lastName: 'García', documentNumber: '87654321' },
      items: [
        { id: 'item-2', name: 'Otro Producto', quantity: 1, unitPrice: 150.00, total: 150.00 },
      ],
      payments: [],
      shipments: [],
      documents: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.order.findMany as jest.Mock).mockResolvedValue(mockOrders);
    (prisma.order.count as jest.Mock).mockResolvedValue(2);
  });

  const createRequest = (params: Record<string, string> = {}) => {
    const url = new URL('http://localhost/api/admin/pedidos');
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return new NextRequest(url.toString(), { method: 'GET' });
  };

  it('should fetch orders with default pagination', async () => {
    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.orders).toHaveLength(2);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(20);
    expect(data.total).toBe(2);
    expect(data.totalPages).toBe(1);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      })
    );
  });

  it('should filter by search term', async () => {
    const req = createRequest({ search: 'Juan' });
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ orderNumber: expect.any(Object) }),
            expect.objectContaining({ user: expect.any(Object) }),
          ]),
        }),
      })
    );
  });

  it('should filter by status', async () => {
    const req = createRequest({ status: 'PAYMENT_CONFIRMED' });
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PAYMENT_CONFIRMED' }),
      })
    );
  });

  it('should filter by payment status', async () => {
    const req = createRequest({ paymentStatus: 'APPROVED' });
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          payments: { some: { status: 'APPROVED' } },
        }),
      })
    );
  });

  it('should filter by date range', async () => {
    const req = createRequest({ dateFrom: '2024-01-15T00:00:00Z', dateTo: '2024-01-16T23:59:59Z' });
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    );
  });

  it('should sort by specified field', async () => {
    const req = createRequest({ sort: 'total', order: 'asc' });
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { total: 'asc' },
      })
    );
  });

  it('should handle pagination correctly', async () => {
    const req = createRequest({ page: '2', limit: '10' });
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.page).toBe(2);
    expect(data.limit).toBe(10);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      })
    );
  });

  it('should reject invalid parameters', async () => {
    const req = createRequest({ page: '0' }); // Invalid page
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Parámetros inválidos');
  });

  it('should reject invalid sort field', async () => {
    const req = createRequest({ sort: 'invalidField' });
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200); // Falls back to default
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      })
    );
  });
});