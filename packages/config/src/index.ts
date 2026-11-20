import { z } from 'zod';

// ============================================
// ENVIRONMENT VALIDATION
// ============================================

export const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_ADMIN_URL: z.string().url(),

  // Database
  DATABASE_URL: z.string().min(1),

  // Auth
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  RESEND_API_KEY: z.string().optional(),

  // Payments - Mercado Pago
  MERCADOPAGO_PUBLIC_KEY: z.string().optional(),
  MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),

  // Payments - Yape/Plin
  YAPE_MERCHANT_ID: z.string().optional(),
  YAPE_API_KEY: z.string().optional(),
  PLIN_MERCHANT_ID: z.string().optional(),
  PLIN_API_KEY: z.string().optional(),

  // Shipping - Shalom
  SHALOM_API_KEY: z.string().optional(),
  SHALOM_API_SECRET: z.string().optional(),
  SHALOM_CLIENT_ID: z.string().optional(),
  SHALOM_BASE_URL: z.string().url().optional(),
  SHALOM_TEST_MODE: z.coerce.boolean().default(true),
  SHALOM_WEBHOOK_SECRET: z.string().optional(),

  // Shipping - Olva
  OLVA_API_KEY: z.string().optional(),
  OLVA_API_SECRET: z.string().optional(),

  // Shipping - Serpost
  SERPOST_API_KEY: z.string().optional(),
  SERPOST_API_SECRET: z.string().optional(),

  // Invoicing - SUNAT
  SUNAT_RUC: z.string().optional(),
  SUNAT_USERNAME: z.string().optional(),
  SUNAT_PASSWORD: z.string().optional(),
  SUNAT_ENDPOINT: z.string().url().optional(),
  PSE_PROVIDER: z.string().optional(),
  PSE_API_KEY: z.string().optional(),
  PSE_BASE_URL: z.string().url().optional(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_PRESET: z.string().optional(),

  // Redis
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  REDIS_URL: z.string().optional(),

  // Search
  ALGOLIA_APP_ID: z.string().optional(),
  ALGOLIA_API_KEY: z.string().optional(),
  ALGOLIA_SEARCH_KEY: z.string().optional(),
  ALGOLIA_INDEX_NAME: z.string().default('products'),

  // Analytics
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  GA_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_GTM_ID: z.string().optional(),
  NEXT_PUBLIC_FB_PIXEL_ID: z.string().optional(),
  NEXT_PUBLIC_TIKTOK_PIXEL_ID: z.string().optional(),
  NEXT_PUBLIC_HOTJAR_ID: z.string().optional(),

  // Error Tracking
  SENTRY_DSN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Feature Flags
  NEXT_PUBLIC_ENABLE_WISHLIST: z.coerce.boolean().default(true),
  NEXT_PUBLIC_ENABLE_REVIEWS: z.coerce.boolean().default(true),
  NEXT_PUBLIC_ENABLE_RECIPES: z.coerce.boolean().default(true),
  NEXT_PUBLIC_ENABLE_BUNDLES: z.coerce.boolean().default(true),
  NEXT_PUBLIC_ENABLE_GIFT_CARDS: z.coerce.boolean().default(true),
  NEXT_PUBLIC_ENABLE_WHOLESALE: z.coerce.boolean().default(true),
  NEXT_PUBLIC_ENABLE_LOYALTY: z.coerce.boolean().default(false),

  // Store Settings
  NEXT_PUBLIC_STORE_NAME: z.string().default('Pizca del Monte'),
  NEXT_PUBLIC_STORE_CURRENCY: z.string().default('PEN'),
  NEXT_PUBLIC_STORE_LOCALE: z.string().default('es-PE'),
  NEXT_PUBLIC_DEFAULT_SHIPPING_CARRIER: z.string().default('shalom'),
  NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD: z.coerce.number().default(150),

  // Cron
  CRON_SECRET: z.string().optional(),

  // External
  WHATSAPP_API_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),

  // i18n
  NEXT_PUBLIC_DEFAULT_LOCALE: z.string().default('es-PE'),
  NEXT_PUBLIC_SUPPORTED_LOCALES: z.string().default('es-PE,en-US'),
  NEXT_PUBLIC_DEFAULT_CURRENCY: z.string().default('PEN'),
  NEXT_PUBLIC_SUPPORTED_CURRENCIES: z.string().default('PEN,USD'),

  // SEO
  NEXT_PUBLIC_SITE_URL: z.string().url().default('https://pizcadelmonte.pe'),
  NEXT_PUBLIC_SITE_NAME: z.string().default('Pizca del Monte'),
  NEXT_PUBLIC_DEFAULT_OG_IMAGE: z.string().default('/images/og-default.jpg'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

// ============================================
// CONSTANTS
// ============================================

export const CURRENCIES = ['PEN', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const LOCALES = ['es-PE', 'en-US'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es-PE';
export const DEFAULT_CURRENCY: Currency = 'PEN';

export const SUPPORTED_LOCALES: Record<Locale, { name: string; flag: string }> = {
  'es-PE': { name: 'Español (Perú)', flag: '🇵🇪' },
  'en-US': { name: 'English (US)', flag: '🇺🇸' },
};

export const SUPPORTED_CURRENCIES: Record<Currency, { symbol: string; name: string; locale: string }> = {
  PEN: { symbol: 'S/', name: 'Sol Peruano', locale: 'es-PE' },
  USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
};

// ============================================
// PAYMENT METHODS
// ============================================

export const PAYMENT_METHODS = [
  { id: 'mercadopago', name: 'Mercado Pago', type: 'gateway', enabled: true },
  { id: 'yape', name: 'Yape', type: 'mobile', enabled: true },
  { id: 'plin', name: 'Plin', type: 'mobile', enabled: true },
  { id: 'bank_transfer', name: 'Transferencia Bancaria', type: 'manual', enabled: true },
  { id: 'cash_on_delivery', name: 'Pago contra entrega', type: 'cash', enabled: false },
] as const;

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]['id'];

// ============================================
// SHIPPING CARRIERS
// ============================================

export const SHIPPING_CARRIERS = [
  { id: 'shalom', name: 'Shalom', type: 'courier', tracking: true, pickup: true },
  { id: 'olva', name: 'Olva Courier', type: 'courier', tracking: true, pickup: true },
  { id: 'serpost', name: 'Serpost', type: 'postal', tracking: true, pickup: false },
  { id: 'pickup', name: 'Recojo en tienda', type: 'pickup', tracking: false, pickup: false },
] as const;

export type CarrierId = (typeof SHIPPING_CARRIERS)[number]['id'];

// ============================================
// ORDER STATUSES
// ============================================

export const ORDER_STATUSES = [
  { id: 'pending', name: 'Pendiente', color: 'warning', description: 'Pendiente de pago' },
  { id: 'confirmed', name: 'Confirmado', color: 'info', description: 'Pago confirmado' },
  { id: 'processing', name: 'Procesando', color: 'primary', description: 'Preparando envío' },
  { id: 'shipped', name: 'Enviado', color: 'secondary', description: 'En camino' },
  { id: 'delivered', name: 'Entregado', color: 'success', description: 'Entregado al cliente' },
  { id: 'cancelled', name: 'Cancelado', color: 'destructive', description: 'Pedido cancelado' },
  { id: 'refunded', name: 'Reembolsado', color: 'muted', description: 'Dinero devuelto' },
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number]['id'];

// ============================================
// PAYMENT STATUSES
// ============================================

export const PAYMENT_STATUSES = [
  { id: 'pending', name: 'Pendiente', color: 'warning' },
  { id: 'processing', name: 'Procesando', color: 'primary' },
  { id: 'approved', name: 'Aprobado', color: 'success' },
  { id: 'rejected', name: 'Rechazado', color: 'destructive' },
  { id: 'refunded', name: 'Reembolsado', color: 'muted' },
  { id: 'cancelled', name: 'Cancelado', color: 'destructive' },
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]['id'];

// ============================================
// SHIPMENT STATUSES
// ============================================

export const SHIPMENT_STATUSES = [
  { id: 'created', name: 'Creado', color: 'muted' },
  { id: 'picked_up', name: 'Recogido', color: 'info' },
  { id: 'in_transit', name: 'En tránsito', color: 'primary' },
  { id: 'out_for_delivery', name: 'En reparto', color: 'accent' },
  { id: 'delivered', name: 'Entregado', color: 'success' },
  { id: 'failed', name: 'Fallido', color: 'destructive' },
  { id: 'returned', name: 'Devuelto', color: 'warning' },
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number]['id'];

// ============================================
// PRODUCT STATUSES
// ============================================

export const PRODUCT_STATUSES = [
  { id: 'draft', name: 'Borrador', color: 'muted' },
  { id: 'active', name: 'Activo', color: 'success' },
  { id: 'archived', name: 'Archivado', color: 'muted' },
  { id: 'out_of_stock', name: 'Agotado', color: 'warning' },
  { id: 'discontinued', name: 'Descontinuado', color: 'destructive' },
] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number]['id'];

// ============================================
// USER ROLES
// ============================================

export const USER_ROLES = [
  { id: 'superadmin', name: 'Superadministrador', level: 100 },
  { id: 'admin', name: 'Administrador', level: 80 },
  { id: 'catalog', name: 'Catálogo', level: 60 },
  { id: 'warehouse', name: 'Almacén', level: 50 },
  { id: 'sales', name: 'Ventas', level: 40 },
  { id: 'support', name: 'Soporte', level: 30 },
  { id: 'accounting', name: 'Contabilidad', level: 40 },
] as const;

export type UserRole = (typeof USER_ROLES)[number]['id'];

// ============================================
// PERMISSIONS
// ============================================

export const PERMISSIONS = [
  // Users & Roles
  'USER_CREATE', 'USER_READ', 'USER_UPDATE', 'USER_DELETE',
  'ROLE_MANAGE', 'PERMISSION_MANAGE',

  // Products
  'PRODUCT_CREATE', 'PRODUCT_READ', 'PRODUCT_UPDATE', 'PRODUCT_DELETE',
  'PRODUCT_PUBLISH', 'PRODUCT_ARCHIVE',

  // Categories
  'CATEGORY_MANAGE',

  // Collections
  'COLLECTION_MANAGE',

  // Brands
  'BRAND_MANAGE',

  // Attributes
  'ATTRIBUTE_MANAGE',

  // Media
  'MEDIA_UPLOAD', 'MEDIA_DELETE',

  // Pricing
  'PRICE_MANAGE', 'PRICE_LIST_MANAGE',

  // Promotions
  'PROMOTION_MANAGE', 'COUPON_MANAGE',

  // Tax
  'TAX_MANAGE',

  // Inventory
  'INVENTORY_READ', 'INVENTORY_UPDATE',
  'STOCK_MOVEMENT_CREATE', 'STOCK_ADJUSTMENT',
  'LOT_MANAGE', 'PHYSICAL_COUNT',

  // Suppliers
  'SUPPLIER_MANAGE', 'PURCHASE_ORDER_MANAGE',

  // Orders
  'ORDER_READ', 'ORDER_UPDATE', 'ORDER_CANCEL', 'ORDER_REFUND',
  'ORDER_SHIP', 'ORDER_INVOICE',

  // Cart & Checkout
  'CART_MANAGE', 'CHECKOUT_MANAGE',

  // Wholesale
  'WHOLESALE_MANAGE',

  // Customers
  'CUSTOMER_READ', 'CUSTOMER_UPDATE', 'CUSTOMER_DELETE',
  'ADDRESS_MANAGE', 'COMMUNICATION_SEND',

  // Shipping
  'SHIPPING_ZONE_MANAGE', 'CARRIER_MANAGE', 'SHIPPING_RATE_MANAGE',
  'LABEL_TEMPLATE_MANAGE', 'QR_GENERATE', 'BARCODE_GENERATE', 'LABEL_PRINT',

  // Invoicing
  'INVOICE_CREATE', 'INVOICE_READ', 'RECEIPT_CREATE',
  'SUNAT_SEND', 'SUNAT_CONFIGURE',

  // Accounting
  'ACCOUNTING_READ', 'ACCOUNTING_WRITE',
  'CASH_MOVEMENT', 'EXPENSE_MANAGE', 'TAX_CONFIGURE',

  // Reports
  'REPORT_READ', 'REPORT_EXPORT',

  // Audit
  'AUDIT_READ',

  // Settings
  'STORE_SETTINGS', 'INTEGRATION_CONFIGURE',
  'WEBHOOK_MANAGE', 'EMAIL_TEMPLATE_MANAGE',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// ============================================
// TAX TYPES (SUNAT)
// ============================================

export const TAX_TYPES = [
  { id: 'igv', name: 'IGV', code: '1000', defaultRate: 0.18 },
  { id: 'isc', name: 'ISC', code: '2000', defaultRate: 0 },
  { id: 'exonerated', name: 'Exonerado', code: '9997', defaultRate: 0 },
  { id: 'exempt', name: 'Exento', code: '9998', defaultRate: 0 },
  { id: 'free', name: 'Gratuito', code: '9999', defaultRate: 0 },
] as const;

export type TaxType = (typeof TAX_TYPES)[number]['id'];

// ============================================
// DOCUMENT TYPES (SUNAT)
// ============================================

export const DOCUMENT_TYPES = [
  { id: '01', name: 'Factura', code: '01', hasCustomer: true },
  { id: '03', name: 'Boleta de Venta', code: '03', hasCustomer: false },
  { id: '07', name: 'Nota de Crédito', code: '07', hasCustomer: true },
  { id: '08', name: 'Nota de Débito', code: '08', hasCustomer: true },
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number]['id'];

// ============================================
// UBIGEO (Peru Administrative Divisions)
// ============================================

export const DEPARTMENTS = [
  'Amazonas', 'Ancash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca',
  'Callao', 'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín',
  'La Libertad', 'Lambayeque', 'Lima', 'Loreto', 'Madre de Dios',
  'Moquegua', 'Pasco', 'Piura', 'Puno', 'San Martín', 'Tacna',
  'Tumbes', 'Ucayali'
] as const;

// ============================================
// CURRENCY FORMATTING
// ============================================

export function formatCurrency(
  amount: number | string,
  currency: Currency = DEFAULT_CURRENCY,
  locale: Locale = DEFAULT_LOCALE
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(num);
}

export function parseCurrency(amount: string, currency: Currency = DEFAULT_CURRENCY): number {
  const clean = amount.replace(/[^\d.,]/g, '').replace(',', '.');
  return parseFloat(clean);
}

// ============================================
// DATE FORMATTING
// ============================================

export function formatDate(
  date: Date | string,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(d);
}

export function formatRelativeTime(date: Date | string, locale: Locale = DEFAULT_LOCALE): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return locale === 'es-PE' ? `hace ${days} día${days > 1 ? 's' : ''}` : `${days}d ago`;
  if (hours > 0) return locale === 'es-PE' ? `hace ${hours} hora${hours > 1 ? 's' : ''}` : `${hours}h ago`;
  if (minutes > 0) return locale === 'es-PE' ? `hace ${minutes} minuto${minutes > 1 ? 's' : ''}` : `${minutes}m ago`;
  return locale === 'es-PE' ? 'justo ahora' : 'just now';
}

// ============================================
// SLUG GENERATION
// ============================================

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ============================================
// ORDER NUMBER GENERATION
// ============================================

export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PDM-${year}${month}${day}-${random}`;
}

export function generateInvoiceNumber(series: string = 'F001'): string {
  const date = new Date();
  const year = date.getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${series}-${year}-${random}`;
}

// ============================================
// VALIDATION HELPERS
// ============================================

export function isValidDNI(dni: string): boolean {
  return /^\d{8}$/.test(dni);
}

export function isValidRUC(ruc: string): boolean {
  return /^\d{11}$/.test(ruc);
}

export function isValidPhone(phone: string): boolean {
  return /^\+?51\s?9\d{8}$/.test(phone.replace(/\s/g, ''));
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('51')) {
    return `+${clean.slice(0, 2)} ${clean.slice(2, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  }
  if (clean.length === 9) {
    return `+51 ${clean.slice(0, 1)} ${clean.slice(1, 4)} ${clean.slice(4)}`;
  }
  return phone;
}