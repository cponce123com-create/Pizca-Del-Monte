// NubeFact Integration for SUNAT Electronic Invoicing (Peru)
// https://api.nubefact.com/

import { Decimal } from 'decimal.js';

export interface NubeFactConfig {
  apiKey: string;
  baseUrl: string;
  testMode: boolean;
}

export interface SunatDocumentInput {
  operacion: 'generar_comprobante' | 'generar_resumen_diario' | 'generar_nota_credito' | 'generar_nota_debito' | 'consultar_comprobante' | 'anular_comprobante' | 'enviar_comprobante' | 'consultar_estado' | 'consultar_cdr';
  tipo_de_comprobante: 1 | 2 | 3 | 4 | 7 | 8; // 1=Factura, 2=Boleta, 3=Nota de Crédito, 4=Nota de Débito, 7=Resumen Diario, 8=Guía de Remisión
  serie: string;
  numero: number;
  sunat_transaction: 1 | 2; // 1=Venta, 2=Compra
  tipo_documento_emisor: 1 | 4 | 6 | 7; // 1=DNI, 4=Carnet Extranjería, 6=RUC, 7=Pasaporte
  numero_documento_emisor: string;
  tipo_documento_receptor: 1 | 4 | 6 | 7;
  numero_documento_receptor: string;
  nombre_receptor: string;
  direccion_receptor: string;
  ubigeo_receptor?: string;
  departamento_receptor?: string;
  provincia_receptor?: string;
  distrito_receptor?: string;
  email_receptor?: string;
  celular_receptor?: string;
  fecha_emision: string; // YYYY-MM-DD
  fecha_vencimiento?: string; // YYYY-MM-DD
  tipo_moneda: 'PEN' | 'USD';
  tipo_cambio?: number;
  porc_igv: number; // 18.00, 10.00, 0.00
  descripcion_global?: string;
  items: SunatItem[];
  total_gravadas?: number;
  total_inafectas?: number;
  total_exoneradas?: number;
  total_gratuitas?: number;
  total_descuentos?: number;
  total_igv?: number;
  total_isc?: number;
  total_otros_tributos?: number;
  total?: number;
  total_letras?: string;
  anticipos?: SunatAnticipo[];
  forma_pago?: {
    forma_pago: 'Contado' | 'Credito';
    cuotas?: SunatCuota[];
  };
  // Nota de crédito/débito
  documento_que_se_modifica_tipo?: 1 | 3 | 4;
  documento_que_se_modifica_serie?: string;
  documento_que_se_modifica_numero?: number;
  documento_que_se_modifica_fecha?: string;
  tipo_nota_credito?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  tipo_nota_debito?: 1 | 2 | 3 | 4 | 5;
  // Guía de remisión
  guia_transportista?: {
    tipo_documento_transportista?: 1 | 4 | 6 | 7;
    numero_documento_transportista?: string;
    nombre_transportista?: string;
    placa_vehiculo?: string;
    numero_licencia_conducir?: string;
    ubigeo_partida?: string;
    direccion_partida?: string;
    ubigeo_llegada?: string;
    direccion_llegada?: string;
    fecha_traslado?: string;
    peso_bruto_total?: number;
    numero_bultos?: number;
  };
  // Resumen diario
  resumen_diario?: {
    fecha_emision: string;
    referencia: string;
    tipo_documento: 1 | 3 | 4;
    serie: string;
    correlativo_inicio: number;
    correlativo_fin: number;
    total_gravadas: number;
    total_inafectas: number;
    total_exoneradas: number;
    total_igv: number;
    total: number;
  };
}

export interface SunatItem {
  unidad_de_medida: string; // NIU, KG, LT, etc.
  codigo_producto_sunat: string; // Código SUNAT
  codigo_producto_propio?: string;
  descripcion: string;
  cantidad: number;
  valor_unitario: number; // Precio unitario sin IGV
  precio_unitario: number; // Precio unitario con IGV
  tipo_afectacion_igv: 10 | 20 | 30; // 10=Gravado, 20=Exonerado, 30=Inafecto
  porc_igv?: number;
  porc_isc?: number;
  porc_otros_tributos?: number;
  total_base_igv?: number;
  total_igv?: number;
  total_isc?: number;
  total_otros_tributos?: number;
  total?: number;
  anticipo_regularizacion?: boolean;
  // Descuentos
  descuento?: {
    tipo_descuento: 1 | 2; // 1=Porcentaje, 2=Monto
    valor: number;
    base_calculo?: number;
  };
  // Detracción/Percepción
  detraccion?: {
    sujeto_a_detraccion: boolean;
    tipo_bien_servicio?: string;
    porc_detraccion?: number;
  };
  percepcion?: {
    sujeto_a_percepcion: boolean;
    tipo_percepcion?: string;
    porc_percepcion?: number;
  };
}

export interface SunatAnticipo {
  documento_tipo: 1 | 3 | 4;
  documento_serie: string;
  documento_numero: number;
  monto: number;
}

export interface SunatCuota {
  monto: number;
  fecha_vencimiento: string;
}

export interface NubeFactResponse {
  success: boolean;
  mensaje?: string;
  errors?: string[];
  // En caso de éxito
  cdr?: string; // XML CDR (Constancia de Recepción)
  xml?: string; // XML del comprobante
  pdf_url?: string;
  hash_cpe?: string;
  sunat_response?: {
    codigo: string;
    descripcion: string;
    nota?: string;
  };
  // Para consulta de estado
  estado?: string;
  estado_descripcion?: string;
}

export class NubeFactClient {
  private config: NubeFactConfig;

  constructor(config: NubeFactConfig) {
    this.config = config;
  }

  async sendRequest(input: SunatDocumentInput): Promise<NubeFactResponse> {
    const url = `${this.config.baseUrl}/factura`;

    const payload = {
      ...input,
      operacion: input.operacion || 'generar_comprobante',
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          mensaje: data.mensaje || `Error HTTP ${response.status}`,
          errors: data.errors || [data.mensaje || 'Error desconocido'],
        };
      }

      return {
        success: true,
        cdr: data.cdr,
        xml: data.xml,
        pdf_url: data.pdf_url,
        hash_cpe: data.hash_cpe,
        sunat_response: data.sunat_response,
        estado: data.estado,
        estado_descripcion: data.estado_descripcion,
      };
    } catch (error) {
      return {
        success: false,
        mensaje: error instanceof Error ? error.message : 'Error de conexión',
        errors: [error instanceof Error ? error.message : 'Error de conexión'],
      };
    }
  }

  async generateInvoice(input: Omit<SunatDocumentInput, 'tipo_de_comprobante'>): Promise<NubeFactResponse> {
    return this.sendRequest({ ...input, tipo_de_comprobante: 1 });
  }

  async generateReceipt(input: Omit<SunatDocumentInput, 'tipo_de_comprobante'>): Promise<NubeFactResponse> {
    return this.sendRequest({ ...input, tipo_de_comprobante: 2 });
  }

  async generateCreditNote(input: SunatDocumentInput): Promise<NubeFactResponse> {
    return this.sendRequest({ ...input, tipo_de_comprobante: 3 });
  }

  async generateDebitNote(input: SunatDocumentInput): Promise<NubeFactResponse> {
    return this.sendRequest({ ...input, tipo_de_comprobante: 4 });
  }

  async generateDispatchGuide(input: SunatDocumentInput): Promise<NubeFactResponse> {
    return this.sendRequest({ ...input, tipo_de_comprobante: 8 });
  }

  async queryDocument(serie: string, numero: number, tipo: 1 | 2 | 3 | 4 | 8): Promise<NubeFactResponse> {
    return this.sendRequest({
      operacion: 'consultar_comprobante',
      tipo_de_comprobante: tipo,
      serie,
      numero,
      // Campos requeridos mínimos para consulta
      sunat_transaction: 1,
      tipo_documento_emisor: 6,
      numero_documento_emisor: '',
      tipo_documento_receptor: 6,
      numero_documento_receptor: '',
      nombre_receptor: '',
      direccion_receptor: '',
      fecha_emision: new Date().toISOString().split('T')[0],
      tipo_moneda: 'PEN',
      porc_igv: 18,
      items: [],
    });
  }

  async voidDocument(serie: string, numero: number, tipo: 1 | 2 | 3 | 4 | 8, motivo: string): Promise<NubeFactResponse> {
    return this.sendRequest({
      operacion: 'anular_comprobante',
      tipo_de_comprobante: tipo,
      serie,
      numero,
      sunat_transaction: 1,
      tipo_documento_emisor: 6,
      numero_documento_emisor: '',
      tipo_documento_receptor: 6,
      numero_documento_receptor: '',
      nombre_receptor: '',
      direccion_receptor: '',
      fecha_emision: new Date().toISOString().split('T')[0],
      tipo_moneda: 'PEN',
      porc_igv: 18,
      items: [],
      descripcion_global: motivo,
    });
  }

  async sendToSunat(serie: string, numero: number, tipo: 1 | 2 | 3 | 4 | 8): Promise<NubeFactResponse> {
    return this.sendRequest({
      operacion: 'enviar_comprobante',
      tipo_de_comprobante: tipo,
      serie,
      numero,
      sunat_transaction: 1,
      tipo_documento_emisor: 6,
      numero_documento_emisor: '',
      tipo_documento_receptor: 6,
      numero_documento_receptor: '',
      nombre_receptor: '',
      direccion_receptor: '',
      fecha_emision: new Date().toISOString().split('T')[0],
      tipo_moneda: 'PEN',
      porc_igv: 18,
      items: [],
    });
  }

  async queryStatus(serie: string, numero: number, tipo: 1 | 2 | 3 | 4 | 8): Promise<NubeFactResponse> {
    return this.sendRequest({
      operacion: 'consultar_estado',
      tipo_de_comprobante: tipo,
      serie,
      numero,
      sunat_transaction: 1,
      tipo_documento_emisor: 6,
      numero_documento_emisor: '',
      tipo_documento_receptor: 6,
      numero_documento_receptor: '',
      nombre_receptor: '',
      direccion_receptor: '',
      fecha_emision: new Date().toISOString().split('T')[0],
      tipo_moneda: 'PEN',
      porc_igv: 18,
      items: [],
    });
  }
}

// Helper functions for building NubeFact payloads from Order data
export function buildNubeFactItem(
  orderItem: {
    sku: string;
    name: string;
    quantity: number;
    unitPrice: Decimal | number;
    taxRate: Decimal | number;
    discountAmount?: Decimal | number;
    isGiftCard?: boolean;
  },
  config: { defaultUnitOfMeasure: string; defaultProductSunatCode: string; igvRate: number }
): SunatItem {
  const unitPrice = new Decimal(orderItem.unitPrice);
  const quantity = new Decimal(orderItem.quantity);
  const taxRate = new Decimal(orderItem.taxRate);
  const discount = orderItem.discountAmount ? new Decimal(orderItem.discountAmount) : new Decimal(0);

  const subTotal = unitPrice.mul(quantity);
  const discountTotal = discount;
  const baseImponible = subTotal.minus(discountTotal);
  const igvAmount = baseImponible.mul(taxRate).div(100);
  const total = baseImponible.plus(igvAmount);

  const tipoAfectacion = taxRate.equals(0) ? 30 : 10; // 30=Inafecto, 10=Gravado

  return {
    unidad_de_medida: config.defaultUnitOfMeasure,
    codigo_producto_sunat: config.defaultProductSunatCode,
    codigo_producto_propio: orderItem.sku,
    descripcion: orderItem.name,
    cantidad: quantity.toNumber(),
    valor_unitario: baseImponible.div(quantity).toNumber(),
    precio_unitario: total.div(quantity).toNumber(),
    tipo_afectacion_igv: tipoAfectacion,
    porc_igv: config.igvRate,
    total_base_igv: baseImponible.toNumber(),
    total_igv: igvAmount.toNumber(),
    total: total.toNumber(),
  };
}

export function buildAddressString(address: {
  addressLine1: string;
  addressLine2?: string;
  neighborhood?: string;
  district: string;
  province: string;
  department: string;
  postalCode?: string;
}): string {
  const parts = [
    address.addressLine1,
    address.addressLine2,
    address.neighborhood,
    address.district,
    address.province,
    address.department,
    address.postalCode,
  ].filter(Boolean);
  return parts.join(', ');
}

// Tipo de documento SUNAT mapping
export const SunatDocumentType = {
  DNI: 1,
  CE: 4,
  RUC: 6,
  PASAPORTE: 7,
} as const;

export const SunatComprobanteType = {
  FACTURA: 1,
  BOLETA: 2,
  NOTA_CREDITO: 3,
  NOTA_DEBITO: 4,
  RESUMEN_DIARIO: 7,
  GUIA_REMISION: 8,
} as const;

export const SunatAfectacionIGV = {
  GRAVADO: 10,
  EXONERADO: 20,
  INAFECTO: 30,
} as const;

export const SunatMoneda = {
  PEN: 'PEN',
  USD: 'USD',
} as const;

export const SunatUnidadMedida = {
  UNIDAD: 'NIU',
  KILOGRAMO: 'KG',
  LITRO: 'LT',
  METRO: 'MTR',
  METRO_CUADRADO: 'MTK',
  METRO_CUBICO: 'MTQ',
  PAQUETE: 'PK',
  CAJA: 'BX',
  BOLSA: 'BG',
  BOTELLA: 'BO',
  LATA: 'CN',
  FRASCO: 'BTL',
  TUBO: 'TU',
  SOBRE: 'EN',
  HOJA: 'SH',
  METRO_LINEAL: 'MTR',
} as const;