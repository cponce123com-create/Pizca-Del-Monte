import { NubeFactClient, buildNubeFactItem, buildAddressString, SunatDocumentType, SunatComprobanteType, SunatAfectacionIGV } from '@pizca/utils';
import { Decimal } from 'decimal.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('NubeFact Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PSE_API_KEY = 'test-api-key';
    process.env.PSE_BASE_URL = 'https://api.nubefact.com/api/v1';
  });

  afterEach(() => {
    delete process.env.PSE_API_KEY;
    delete process.env.PSE_BASE_URL;
  });

  describe('NubeFactClient', () => {
    const client = new NubeFactClient({
      apiKey: 'test-key',
      baseUrl: 'https://api.test.com',
      testMode: true,
    });

    it('should build correct request payload for invoice', async () => {
      const mockResponse = {
        success: true,
        cdr: 'base64-cdr',
        xml: 'base64-xml',
        pdf_url: 'https://example.com/pdf',
        hash_cpe: 'hash123',
        sunat_response: { codigo: '0', descripcion: 'ACEPTADO' },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.generateInvoice({
        serie: 'F001',
        numero: 1,
        sunat_transaction: 1,
        tipo_documento_emisor: SunatDocumentType.RUC,
        numero_documento_emisor: '20123456789',
        tipo_documento_receptor: SunatDocumentType.DNI,
        numero_documento_receptor: '12345678',
        nombre_receptor: 'Juan Pérez',
        direccion_receptor: 'Av. Lima 123, Lima',
        fecha_emision: '2024-01-15',
        tipo_moneda: 'PEN',
        porc_igv: 18,
        items: [
          {
            unidad_de_medida: 'NIU',
            codigo_producto_sunat: '10000000',
            descripcion: 'Producto Test',
            cantidad: 2,
            valor_unitario: 100,
            precio_unitario: 118,
            tipo_afectacion_igv: SunatAfectacionIGV.GRAVADO,
            porc_igv: 18,
            total_base_igv: 200,
            total_igv: 36,
            total: 236,
          },
        ],
        total: 236,
      });

      expect(result.success).toBe(true);
      expect(result.cdr).toBe('base64-cdr');
      expect(result.pdf_url).toBe('https://example.com/pdf');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.test.com/factura',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
          }),
        })
      );
    });

    it('should handle NubeFact error response', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          mensaje: 'Error en los datos',
          errors: ['RUC inválido', 'Serie duplicada'],
        }),
      });

      const result = await client.generateReceipt({
        serie: 'B001',
        numero: 1,
        sunat_transaction: 1,
        tipo_documento_emisor: SunatDocumentType.RUC,
        numero_documento_emisor: '20123456789',
        tipo_documento_receptor: SunatDocumentType.DNI,
        numero_documento_receptor: '12345678',
        nombre_receptor: 'Juan Pérez',
        direccion_receptor: 'Av. Lima 123',
        fecha_emision: '2024-01-15',
        tipo_moneda: 'PEN',
        porc_igv: 18,
        items: [],
        total: 100,
      });

      expect(result.success).toBe(false);
      expect(result.mensaje).toBe('Error en los datos');
      expect(result.errors).toContain('RUC inválido');
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await client.generateInvoice({
        serie: 'F001',
        numero: 1,
        sunat_transaction: 1,
        tipo_documento_emisor: SunatDocumentType.RUC,
        numero_documento_emisor: '20123456789',
        tipo_documento_receptor: SunatDocumentType.DNI,
        numero_documento_receptor: '12345678',
        nombre_receptor: 'Juan Pérez',
        direccion_receptor: 'Av. Lima 123',
        fecha_emision: '2024-01-15',
        tipo_moneda: 'PEN',
        porc_igv: 18,
        items: [],
        total: 100,
      });

      expect(result.success).toBe(false);
      expect(result.mensaje).toBe('Network error');
    });
  });

  describe('buildNubeFactItem', () => {
    it('should build item with correct calculations for gravado', () => {
      const item = buildNubeFactItem({
        sku: 'TEST-001',
        name: 'Producto Test',
        quantity: 2,
        unitPrice: new Decimal('100.00'),
        taxRate: new Decimal('18.00'),
        discountAmount: new Decimal('10.00'),
      }, {
        defaultUnitOfMeasure: 'NIU',
        defaultProductSunatCode: '10000000',
        igvRate: 18,
      });

      expect(item.codigo_producto_propio).toBe('TEST-001');
      expect(item.descripcion).toBe('Producto Test');
      expect(item.cantidad).toBe(2);
      expect(item.tipo_afectacion_igv).toBe(SunatAfectacionIGV.GRAVADO);
      expect(item.porc_igv).toBe(18);
      // Subtotal: 200, Discount: 10, Base: 190, IGV: 34.2, Total: 224.2
      expect(item.total_base_igv).toBeCloseTo(190, 1);
      expect(item.total_igv).toBeCloseTo(34.2, 1);
      expect(item.total).toBeCloseTo(224.2, 1);
    });

    it('should build item with inafecto tax rate', () => {
      const item = buildNubeFactItem({
        sku: 'TEST-002',
        name: 'Producto Exportación',
        quantity: 1,
        unitPrice: new Decimal('500.00'),
        taxRate: new Decimal('0.00'),
      }, {
        defaultUnitOfMeasure: 'NIU',
        defaultProductSunatCode: '10000000',
        igvRate: 0,
      });

      expect(item.tipo_afectacion_igv).toBe(SunatAfectacionIGV.INAFECTO);
      expect(item.porc_igv).toBe(0);
      expect(item.total_igv).toBe(0);
      expect(item.total).toBe(500);
    });
  });

  describe('buildAddressString', () => {
    it('should build complete address string', () => {
      const address = buildAddressString({
        addressLine1: 'Av. Principal 123',
        addressLine2: 'Dpto 401',
        neighborhood: 'Urbanización Los Olivos',
        district: 'San Isidro',
        province: 'Lima',
        department: 'Lima',
        postalCode: '15073',
      });

      expect(address).toBe('Av. Principal 123, Dpto 401, Urbanización Los Olivos, San Isidro, Lima, Lima, 15073');
    });

    it('should handle optional fields', () => {
      const address = buildAddressString({
        addressLine1: 'Calle Falsa 123',
        district: 'Miraflores',
        province: 'Lima',
        department: 'Lima',
      });

      expect(address).toBe('Calle Falsa 123, Miraflores, Lima, Lima');
    });
  });

  describe('Constants', () => {
    it('should have correct document type mappings', () => {
      expect(SunatDocumentType.DNI).toBe(1);
      expect(SunatDocumentType.CE).toBe(4);
      expect(SunatDocumentType.RUC).toBe(6);
      expect(SunatDocumentType.PASAPORTE).toBe(7);
    });

    it('should have correct comprobante type mappings', () => {
      expect(SunatComprobanteType.FACTURA).toBe(1);
      expect(SunatComprobanteType.BOLETA).toBe(2);
      expect(SunatComprobanteType.NOTA_CREDITO).toBe(3);
      expect(SunatComprobanteType.NOTA_DEBITO).toBe(4);
      expect(SunatComprobanteType.RESUMEN_DIARIO).toBe(7);
      expect(SunatComprobanteType.GUIA_REMISION).toBe(8);
    });

    it('should have correct afectacion IGV mappings', () => {
      expect(SunatAfectacionIGV.GRAVADO).toBe(10);
      expect(SunatAfectacionIGV.EXONERADO).toBe(20);
      expect(SunatAfectacionIGV.INAFECTO).toBe(30);
    });
  });
});