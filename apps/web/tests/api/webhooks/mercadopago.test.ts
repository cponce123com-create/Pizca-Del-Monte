import { POST, GET } from '@/app/api/webhooks/mercadopago/route';
import { prisma } from '@pizca/database';
import { mockOrder, resetMocks } from '@/tests/setup';

// Mock NextRequest
function createMockRequest(body: any, headers?: Record<string, string>) {
  return new Request('http://localhost:3000/api/webhooks/mercadopago', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'x-signature': 'ts=1234567890,v1=testhash',
      'x-request-id': 'req_test_123',
      ...headers,
    },
  });
}

describe('/api/webhooks/mercadopago', () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
    process.env.MERCADOPAGO_WEBHOOK_SECRET = 'test-secret';
    process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-123456';
  });

  describe('GET', () => {
    it('returns health check', async () => {
      const response = await GET();
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.service).toBe('Mercado Pago Webhook');
    });
  });

  describe('POST', () => {
    it('processes approved payment notification', async () => {
      const mockPayment = {
        id: 123456789,
        external_reference: mockOrder.orderNumber,
        status: 'approved',
        status_detail: 'accredited',
        date_approved: new Date().toISOString(),
      };

      jest.mocked(prisma.order.findUnique).mockResolvedValue({
        ...mockOrder,
        payment: { id: 'pay_test_1' },
        shipment: { id: 'ship_test_1' },
        items: mockOrder.items || [],
      });

      const mockTx = {
        payment: { update: jest.fn().mockResolvedValue({}) },
        order: { update: jest.fn().mockResolvedValue({}) },
        orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
        shipment: { update: jest.fn().mockResolvedValue({}) },
        productVariant: { update: jest.fn().mockResolvedValue({}) },
        product: { update: jest.fn().mockResolvedValue({}) },
      };
      jest.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(mockTx as any));

      // Mock Mercado Pago SDK
      const { Payment } = await import('mercadopago');
      jest.mocked(Payment.prototype.get).mockResolvedValue(mockPayment);

      const request = createMockRequest({
        action: 'payment.updated',
        data: { id: '123456789' },
        type: 'payment',
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.orderNumber).toBe(mockOrder.orderNumber);
      expect(data.status).toBe('approved');
      expect(mockTx.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderId: mockOrder.id },
          data: expect.objectContaining({
            status: 'COMPLETED',
            providerPaymentId: '123456789',
          }),
        })
      );
      expect(mockTx.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockOrder.id },
          data: expect.objectContaining({
            status: 'PAYMENT_CONFIRMED',
            paidAmount: mockOrder.total,
            balanceDue: '0',
          }),
        })
      );
    });

    it('processes rejected payment notification', async () => {
      const mockPayment = {
        id: 123456790,
        external_reference: mockOrder.orderNumber,
        status: 'rejected',
        status_detail: 'cc_rejected_insufficient_amount',
        date_approved: null,
      };

      jest.mocked(prisma.order.findUnique).mockResolvedValue({
        ...mockOrder,
        payment: { id: 'pay_test_1' },
        shipment: { id: 'ship_test_1' },
        items: [],
      });

      const mockTx = {
        payment: { update: jest.fn().mockResolvedValue({}) },
        order: { update: jest.fn().mockResolvedValue({}) },
        orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
      };
      jest.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(mockTx as any));

      const { Payment } = await import('mercadopago');
      jest.mocked(Payment.prototype.get).mockResolvedValue(mockPayment);

      const request = createMockRequest({
        action: 'payment.updated',
        data: { id: '123456790' },
        type: 'payment',
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('rejected');
      expect(mockTx.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FAILED',
            failureReason: 'cc_rejected_insufficient_amount',
          }),
        })
      );
      expect(mockTx.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PAYMENT_FAILED',
          }),
        })
      );
    });

    it('processes pending payment notification', async () => {
      const mockPayment = {
        id: 123456791,
        external_reference: mockOrder.orderNumber,
        status: 'pending',
        status_detail: 'pending_waiting_transfer',
        date_approved: null,
      };

      jest.mocked(prisma.order.findUnique).mockResolvedValue({
        ...mockOrder,
        payment: { id: 'pay_test_1' },
        shipment: { id: 'ship_test_1' },
        items: [],
      });

      const mockTx = {
        payment: { update: jest.fn().mockResolvedValue({}) },
        order: { update: jest.fn().mockResolvedValue({}) },
        orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
      };
      jest.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(mockTx as any));

      const { Payment } = await import('mercadopago');
      jest.mocked(Payment.prototype.get).mockResolvedValue(mockPayment);

      const request = createMockRequest({
        action: 'payment.created',
        data: { id: '123456791' },
        type: 'payment',
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('pending');
    });

    it('processes refunded payment notification', async () => {
      const mockPayment = {
        id: 123456792,
        external_reference: mockOrder.orderNumber,
        status: 'refunded',
        status_detail: 'refunded',
        date_approved: new Date().toISOString(),
      };

      jest.mocked(prisma.order.findUnique).mockResolvedValue({
        ...mockOrder,
        payment: { id: 'pay_test_1' },
        shipment: { id: 'ship_test_1' },
        items: [],
      });

      const mockTx = {
        payment: { update: jest.fn().mockResolvedValue({}) },
        order: { update: jest.fn().mockResolvedValue({}) },
        orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
      };
      jest.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(mockTx as any));

      const { Payment } = await import('mercadopago');
      jest.mocked(Payment.prototype.get).mockResolvedValue(mockPayment);

      const request = createMockRequest({
        action: 'payment.updated',
        data: { id: '123456792' },
        type: 'payment',
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('refunded');
      expect(mockTx.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REFUNDED',
          }),
        })
      );
    });

    it('ignores non-payment notifications', async () => {
      const request = createMockRequest({
        action: 'merchant_order.updated',
        data: { id: '123456789' },
        type: 'merchant_order',
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toBe(true);
    });

    it('returns 401 for invalid signature in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.MERCADOPAGO_WEBHOOK_SECRET = 'test-secret';

      const request = createMockRequest({
        action: 'payment.updated',
        data: { id: '123456789' },
        type: 'payment',
      }, {
        'x-signature': 'ts=1234567890,v1=invalidhash',
        'x-request-id': 'req_test_123',
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Invalid signature');

      process.env.NODE_ENV = 'test';
    });

    it('allows requests without signature in development', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.MERCADOPAGO_WEBHOOK_SECRET;

      const mockPayment = {
        id: 123456793,
        external_reference: mockOrder.orderNumber,
        status: 'approved',
        status_detail: 'accredited',
        date_approved: new Date().toISOString(),
      };

      jest.mocked(prisma.order.findUnique).mockResolvedValue({
        ...mockOrder,
        payment: { id: 'pay_test_1' },
        shipment: { id: 'ship_test_1' },
        items: [],
      });

      const mockTx = {
        payment: { update: jest.fn().mockResolvedValue({}) },
        order: { update: jest.fn().mockResolvedValue({}) },
        orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
      };
      jest.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(mockTx as any));

      const { Payment } = await import('mercadopago');
      jest.mocked(Payment.prototype.get).mockResolvedValue(mockPayment);

      const request = new Request('http://localhost:3000/api/webhooks/mercadopago', {
        method: 'POST',
        body: JSON.stringify({
          action: 'payment.updated',
          data: { id: '123456793' },
          type: 'payment',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      process.env.NODE_ENV = 'test';
    });

    it('returns 404 for order not found', async () => {
      const mockPayment = {
        id: 123456794,
        external_reference: 'PDM-NONEXISTENT',
        status: 'approved',
        status_detail: 'accredited',
        date_approved: new Date().toISOString(),
      };

      jest.mocked(prisma.order.findUnique).mockResolvedValue(null);

      const { Payment } = await import('mercadopago');
      jest.mocked(Payment.prototype.get).mockResolvedValue(mockPayment);

      const request = createMockRequest({
        action: 'payment.updated',
        data: { id: '123456794' },
        type: 'payment',
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Order not found');
    });
  });
});