import '@testing-library/jest-dom';

// Mock environment variables
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.UPSTASH_REDIS_REST_URL = 'http://localhost:8079';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
process.env.NODE_ENV = 'test';
process.env.DEMO_MODE = 'true';
process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-123456';
process.env.MERCADOPAGO_PUBLIC_KEY = 'TEST-PUB-123456';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  notFound: jest.fn(),
}));

jest.mock('next/headers', () => ({
  cookies: () => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  }),
  headers: () => new Headers(),
}));

// Mock Prisma
jest.mock('@pizca/database', () => ({
  prisma: {
    cart: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    cartItem: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    productVariant: {
      findUnique: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    orderItem: {
      create: jest.fn(),
    },
    orderStatusHistory: {
      create: jest.fn(),
    },
    orderCoupon: {
      create: jest.fn(),
    },
    coupon: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    address: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    shipment: {
      create: jest.fn(),
    },
    inventoryItem: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    productVariant: {
      update: jest.fn(),
    },
    carrier: {
      findMany: jest.fn(),
    },
    shippingZone: {
      findMany: jest.fn(),
    },
    shippingRate: {
      findMany: jest.fn(),
    },
    shippingRule: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(jest.mocked(prisma))),
    auditLog: {
      create: jest.fn(),
    },
  },
}));

// Mock NextAuth
jest.mock('@/lib/auth/config', () => ({
  auth: jest.fn(),
}));

// Mock formatPEN
jest.mock('@pizca/utils', () => ({
  formatPEN: (amount: number) => `S/ ${amount.toFixed(2)}`,
}));

// Mock Mercado Pago
jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn().mockImplementation(() => ({})),
  Preference: jest.fn().mockImplementation(() => ({
    create: jest.fn().mockResolvedValue({
      id: 'pref_test_123',
      init_point: 'https://www.mercadopago.com/checkout/v1/redirect?pref_id=pref_test_123',
    }),
  })),
}));

// Global test utilities
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import { prisma } from '@pizca/database';

// Helper to reset all mocks
export function resetMocks() {
  jest.clearAllMocks();
}

// Mock cart data
export const mockCart = {
  id: 'cart_test_123',
  userId: 'user_test_123',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  items: [
    {
      id: 'item_test_1',
      cartId: 'cart_test_123',
      productId: 'prod_test_1',
      variantId: 'var_test_1',
      quantity: 2,
      price: 25.50,
      product: {
        id: 'prod_test_1',
        name: 'Ají Amarillo',
        slug: 'aji-amarillo',
        basePrice: 25.50,
        compareAtPrice: 30.00,
        shortDescription: 'Ají amarillo fresco',
        description: 'Descripción completa',
        weight: 0.2,
        trackInventory: true,
        status: 'ACTIVE',
        brand: { id: 'brand_1', name: 'Pizca', slug: 'pizca' },
        media: [{ url: '/images/aji.jpg', alt: 'Ají', isPrimary: true }],
        inventory: { availableQty: 50 },
        variants: [],
      },
      variant: {
        id: 'var_test_1',
        sku: 'AJI-AMA-001',
        name: 'Ají Amarillo 200g',
        price: 25.50,
        compareAtPrice: 30.00,
        weight: 0.2,
        trackInventory: true,
        inventory: { availableQty: 50 },
        attributes: [
          {
            attribute: { name: 'Peso', id: 'attr_weight' },
            attributeValue: { value: '200g', color: null },
          },
        ],
      },
    },
  ],
};

// Mock product data
export const mockProducts = [
  {
    id: 'prod_test_1',
    sku: 'AJI-AMA-001',
    name: 'Ají Amarillo',
    slug: 'aji-amarillo',
    shortDescription: 'Ají amarillo fresco del valle',
    description: 'Descripción completa del ají',
    type: 'SIMPLE',
    basePrice: 25.50,
    compareAtPrice: 30.00,
    trackInventory: true,
    status: 'ACTIVE',
    brand: { id: 'brand_1', name: 'Pizca', slug: 'pizca' },
    categories: [{ category: { id: 'cat_1', name: 'Ajíes', slug: 'ajies' }, isPrimary: true }],
    media: [{ url: '/images/aji.jpg', alt: 'Ají', isPrimary: true }],
    variants: [
      {
        id: 'var_test_1',
        sku: 'AJI-AMA-001',
        name: 'Ají Amarillo 200g',
        price: 25.50,
        weight: 0.2,
        trackInventory: true,
        inventory: { availableQty: 50 },
        attributes: [
          {
            attribute: { name: 'Peso', id: 'attr_weight' },
            attributeValue: { value: '200g', color: null },
          },
        ],
      },
    ],
    inventory: { availableQty: 50 },
    publishedAt: new Date(),
  },
];

// Mock shipping methods
export const mockShippingMethods = [
  {
    id: 'ship_test_1',
    name: 'Envío Estándar',
    carrierName: 'Olva Courier',
    carrierId: 'carrier_1',
    basePrice: 15.00,
    estimatedDays: '3-5 días hábiles',
    minWeight: 0,
    maxWeight: 30,
  },
  {
    id: 'ship_test_2',
    name: 'Envío Express',
    carrierName: 'Shalom',
    carrierId: 'carrier_2',
    basePrice: 25.00,
    estimatedDays: '1-2 días hábiles',
    minWeight: 0,
    maxWeight: 10,
  },
];

// Mock payment methods
export const mockPaymentMethods = [
  { id: 'MERCADO_PAGO', name: 'Mercado Pago', type: 'online', description: 'Tarjetas, Yape, Plin, efectivo' },
  { id: 'YAPE', name: 'Yape', type: 'mobile', description: 'Pago móvil con Yape' },
  { id: 'PLIN', name: 'Plin', type: 'mobile', description: 'Pago móvil con Plin' },
  { id: 'BANK_TRANSFER', name: 'Transferencia Bancaria', type: 'offline', description: 'Transferencia a cuenta BCP/Interbank' },
  { id: 'CASH_ON_DELIVERY', name: 'Contraentrega', type: 'offline', description: 'Pago al recibir el pedido' },
];

// Mock saved addresses
export const mockSavedAddresses = [
  {
    id: 'addr_test_1',
    type: 'shipping',
    isDefault: true,
    firstName: 'Juan',
    lastName: 'Pérez',
    addressLine1: 'Av. Larco 123',
    addressLine2: 'Dpto 401',
    neighborhood: 'Miraflores',
    district: 'Miraflores',
    province: 'Lima',
    department: 'Lima',
    postalCode: '15074',
    country: 'PE',
    phone: '+51987654321',
    instructions: 'Referencia: frente al parque',
  },
];

// Mock order data
export const mockOrder = {
  id: 'order_test_123',
  orderNumber: 'PDM-TEST123',
  userId: 'user_test_123',
  status: 'PENDING_PAYMENT',
  currency: 'PEN',
  subtotal: '51.00',
  discountAmount: '0.00',
  shippingAmount: '15.00',
  taxAmount: '11.88',
  total: '77.88',
  paidAmount: '0.00',
  balanceDue: '77.88',
  shippingAddressId: 'addr_test_1',
  billingAddressId: null,
  shippingMethod: 'Envío Estándar',
  shippingCarrier: 'Olva Courier',
  paymentMethod: 'MERCADO_PAGO',
  paymentIdempotencyKey: 'idem_test_123',
  documentType: 'RECEIPT',
  createdAt: new Date(),
};

// Mock coupon data
export const mockCoupon = {
  id: 'coupon_test_1',
  code: 'DESCUENTO10',
  name: '10% Descuento',
  description: '10% de descuento en tu primera compra',
  type: 'PERCENTAGE',
  value: 10.00,
  minOrderAmount: 50.00,
  maxDiscount: 20.00,
  usageLimit: 100,
  usageCount: 5,
  perCustomerLimit: 1,
  startDate: new Date(Date.now() - 86400000),
  endDate: new Date(Date.now() + 86400000 * 30),
  isActive: true,
  appliesToAll: true,
  requiresCoupon: true,
  couponCode: 'DESCUENTO10',
};