import { POST } from '@/app/api/webhooks/nubefact/route';
import { prisma } from '@pizca/database';
import { NextRequest } from 'next/server';

// Mock Prisma
jest.mock('@pizca/database', () => ({
  prisma: {
    document: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    order: {
      update: jest.fn(),
    },
    accountingEntry: {
      create: jest.fn(),
    },
    account: {
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(prisma)),
  },
}));

// Mock crypto for HMAC verification
jest.mock('crypto', () => ({
  createHmac: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('expected-signature'),
  })),
  timingSafeEqual: jest.fn().mockReturnValue(true),
}));

describe('NubeFact Webhook Handler', () => {
  const mockDocument = {
    id: 'doc-123',
    type: 'INVOICE',
    series: 'F001',
    number: 1,
    orderId: 'order-123',
    metadata: { total: 236, total_igv: 36 },
    sunatStatus: 'PENDIENTE',
  };

  const mockOrder = {
    id: 'order-123',
    userId: 'user-123',
  };

  const validPayload = {
    evento: 'comprobante_aceptado',
    comprobante: {
      tipo_de_comprobante: 1,
      serie: 'F001',
      numero: 1,
      hash_cpe: 'hash123',
      fecha_emision: '2024-01-15',
      sunat_response: {
        codigo: '0',
        descripcion: 'ACEPTADO',
        nota: 'Comprobante aceptado',
      },
      cdr: 'base64-cdr',
      xml: 'base64-xml',
      pdf_url: 'https://example.com/pdf',
    },
    timestamp: '2024-01-15T10:30:00Z',
    firma: 'valid-signature',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NUBEFACT_WEBHOOK_SECRET = 'test-webhook-secret';

    (prisma.document.findFirst as jest.Mock).mockResolvedValue(mockDocument);
    (prisma.order.update as jest.Mock).mockResolvedValue({});
    (prisma.accountingEntry.create as jest.Mock).mockResolvedValue({});
    (prisma.account.findMany as jest.Mock).mockResolvedValue([
      { id: 'acc-12', code: '12' },
      { id: 'acc-40', code: '40' },
      { id: 'acc-10', code: '10' },
      { id: 'acc-41', code: '41' },
    ]);
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  afterEach(() => {
    delete process.env.NUBEFACT_WEBHOOK_SECRET;
  });

  const createRequest = (body: any, signature?: string) => {
    const req = new NextRequest('http://localhost/api/webhooks/nubefact', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...(signature ? { 'x-nubefact-signature': signature } : {}),
      },
    });
    return req;
  };

  it('should process accepted invoice webhook successfully', async () => {
    (prisma.document.update as jest.Mock).mockResolvedValue({
      ...mockDocument,
      sunatStatus: 'ACEPTADO',
    });

    const req = createRequest(validPayload, 'expected-signature');
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'doc-123' },
        data: expect.objectContaining({
          sunatStatus: 'ACEPTADO',
          cdrContent: 'base64-cdr',
          xmlContent: 'base64-xml',
          pdfUrl: 'https://example.com/pdf',
          sunatId: 'hash123',
        }),
      })
    );
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-123' },
        data: expect.objectContaining({
          documentSunatStatus: 'ACEPTADO',
        }),
      })
    );
    expect(prisma.accountingEntry.create).toHaveBeenCalled();
  });

  it('should process rejected invoice webhook', async () => {
    const rejectedPayload = {
      ...validPayload,
      evento: 'comprobante_rechazado',
      comprobante: {
        ...validPayload.comprobante,
        sunat_response: {
          codigo: '1234',
          descripcion: 'RECHAZADO',
          nota: 'Error en la firma digital',
        },
      },
    };

    (prisma.document.update as jest.Mock).mockResolvedValue({
      ...mockDocument,
      sunatStatus: 'RECHAZADO',
    });

    const req = createRequest(rejectedPayload, 'expected-signature');
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sunatStatus: 'RECHAZADO',
        }),
      })
    );
  });

  it('should process voided invoice webhook', async () => {
    const voidedPayload = {
      ...validPayload,
      evento: 'comprobante_anulado',
      comprobante: {
        ...validPayload.comprobante,
        sunat_response: {
          codigo: '0',
          descripcion: 'ANULADO',
          nota: 'Anulado por el contribuyente',
        },
      },
    };

    (prisma.document.update as jest.Mock).mockResolvedValue({
      ...mockDocument,
      sunatStatus: 'ANULADO',
    });

    const req = createRequest(voidedPayload, 'expected-signature');
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sunatStatus: 'ANULADO',
          voidedAt: expect.any(Date),
          voidReason: 'Anulado por el contribuyente',
        }),
      })
    );
  });

  it('should reject webhook with invalid signature', async () => {
    const { timingSafeEqual } = require('crypto');
    timingSafeEqual.mockReturnValueOnce(false);

    const req = createRequest(validPayload, 'invalid-signature');
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Firma inválida');
  });

  it('should reject webhook without signature when secret is configured', async () => {
    const req = createRequest(validPayload); // No signature header
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Firma requerida');
  });

  it('should process webhook without secret configured (with warning)', async () => {
    delete process.env.NUBEFACT_WEBHOOK_SECRET;

    (prisma.document.update as jest.Mock).mockResolvedValue({
      ...mockDocument,
      sunatStatus: 'ACEPTADO',
    });

    const req = createRequest(validPayload);
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should handle missing document gracefully', async () => {
    (prisma.document.findFirst as jest.Mock).mockResolvedValue(null);

    const req = createRequest(validPayload, 'expected-signature');
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200); // Webhook should still return 200 to avoid retries
    expect(data.success).toBe(true);
  });

  it('should handle unknown document type', async () => {
    const unknownTypePayload = {
      ...validPayload,
      comprobante: {
        ...validPayload.comprobante,
        tipo_de_comprobante: 99, // Unknown type
      },
    };

    const req = createRequest(unknownTypePayload, 'expected-signature');
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Should not update document
    expect(prisma.document.update).not.toHaveBeenCalled();
  });
});