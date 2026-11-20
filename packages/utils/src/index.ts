// Shared utilities for Pizca del Monte
import { Decimal } from 'decimal.js';
import { z } from 'zod';

// ============================================
// DECIMAL HELPERS
// ============================================

export function toDecimal(value: number | string | Decimal): Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

export function formatPEN(amount: Decimal | number | string): string {
  const dec = toDecimal(amount);
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(dec.toNumber());
}

export function parsePEN(amount: string): Decimal {
  return new Decimal(amount.replace(/[^\d.,]/g, '').replace(',', '.'));
}

export function roundPEN(amount: Decimal | number | string, decimals = 2): Decimal {
  return toDecimal(amount).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
}

export function calculatePercentage(amount: Decimal | number | string, percentage: Decimal | number | string): Decimal {
  return toDecimal(amount).mul(toDecimal(percentage)).div(100);
}

export function applyDiscount(price: Decimal | number | string, discountPercent: Decimal | number | string): Decimal {
  const p = toDecimal(price);
  const d = toDecimal(discountPercent);
  return p.mul(new Decimal(100).minus(d)).div(100);
}

export function calculateTax(amount: Decimal | number | string, taxRate: Decimal | number | string): Decimal {
  return toDecimal(amount).mul(toDecimal(taxRate));
}

export function calculateTotal(subtotal: Decimal | number | string, tax: Decimal | number | string, shipping: Decimal | number | string = 0, discount: Decimal | number | string = 0): Decimal {
  return toDecimal(subtotal).plus(tax).plus(shipping).minus(discount);
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export const emailSchema = z.string().email({ message: 'Correo electrónico inválido' });

export const phoneSchema = z.string().regex(/^\+?51\s?9\d{8}$/, { message: 'Teléfono peruano inválido (ej: +51 999 888 777)' });

export const dniSchema = z.string().regex(/^\d{8}$/, { message: 'DNI debe tener 8 dígitos' });

export const rucSchema = z.string().regex(/^\d{11}$/, { message: 'RUC debe tener 11 dígitos' });

export const passwordSchema = z.string().min(8, { message: 'Mínimo 8 caracteres' }).regex(/[A-Z]/, { message: 'Debe contener al menos una mayúscula' }).regex(/[a-z]/, { message: 'Debe contener al menos una minúscula' }).regex(/[0-9]/, { message: 'Debe contener al menos un número' });

export const urlSchema = z.string().url({ message: 'URL inválida' });

export const positiveNumberSchema = z.number().positive({ message: 'Debe ser un número positivo' });

export const nonNegativeNumberSchema = z.number().nonnegative({ message: 'Debe ser un número no negativo' });

// ============================================
// ADDRESS VALIDATION
// ============================================

export const addressSchema = z.object({
  firstName: z.string().min(1, { message: 'Nombre requerido' }),
  lastName: z.string().min(1, { message: 'Apellido requerido' }),
  company: z.string().optional(),
  addressLine1: z.string().min(1, { message: 'Dirección requerida' }),
  addressLine2: z.string().optional(),
  neighborhood: z.string().optional(),
  district: z.string().min(1, { message: 'Distrito requerido' }),
  province: z.string().min(1, { message: 'Provincia requerida' }),
  department: z.string().min(1, { message: 'Departamento requerido' }),
  postalCode: z.string().regex(/^\d{5}$/, { message: 'Código postal debe tener 5 dígitos' }).optional(),
  phone: phoneSchema,
  ubigeo: z.string().regex(/^\d{6}$/, { message: 'UBIGEO debe tener 6 dígitos' }).optional(),
  type: z.enum(['shipping', 'billing', 'both']).default('both'),
  isDefault: z.boolean().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;

// ============================================
// DATE HELPERS
// ============================================

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function isPast(date: Date): boolean {
  return date < new Date();
}

export function isFuture(date: Date): boolean {
  return date > new Date();
}

export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function parseDateInput(value: string): Date | null {
  const date = new Date(value + 'T00:00:00');
  return isNaN(date.getTime()) ? null : date;
}

// ============================================
// STRING HELPERS
// ============================================

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function truncate(text: string, length: number, suffix = '...'): string {
  if (text.length <= length) return text;
  return text.slice(0, length - suffix.length).trim() + suffix;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function titleCase(text: string): string {
  return text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

export function maskPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length >= 4) {
    return clean.slice(0, -4).replace(/\d/g, '*') + clean.slice(-4);
  }
  return '****';
}

// ============================================
// ARRAY HELPERS
// ============================================

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

export function groupBy<T, K extends string | number>(array: T[], key: (item: T) => K): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = key(item);
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

export function sortBy<T>(array: T[], key: keyof T | ((item: T) => any), direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = typeof key === 'function' ? key(a) : a[key];
    const bVal = typeof key === 'function' ? key(b) : b[key];
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// ============================================
// OBJECT HELPERS
// ============================================

export function omit<T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
}

export function pick<T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) result[key] = obj[key];
  });
  return result;
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function isEmpty(obj: any): boolean {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
}

// ============================================
// ASYNC HELPERS
// ============================================

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: any[]) => any>(fn: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; delay?: number; backoff?: number } = {}
): Promise<T> {
  const { maxRetries = 3, delay = 1000, backoff = 2 } = options;
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxRetries) throw error;
      await sleep(delay * Math.pow(backoff, attempt));
    }
  }
  throw lastError!;
}

export function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
  ]);
}

// ============================================
// ID GENERATORS
// ============================================

export function generateId(prefix = '', length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

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

export function generateTrackingNumber(carrier: string): string {
  const prefix = carrier.toUpperCase().slice(0, 3);
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

// ============================================
// PERU-SPECIFIC HELPERS
// ============================================

export const PERU_DEPARTMENTS = [
  'Amazonas', 'Ancash', 'Apurímac', 'Arequipa', 'Ayacucho', 'Cajamarca',
  'Callao', 'Cusco', 'Huancavelica', 'Huánuco', 'Ica', 'Junín',
  'La Libertad', 'Lambayeque', 'Lima', 'Loreto', 'Madre de Dios',
  'Moquegua', 'Pasco', 'Piura', 'Puno', 'San Martín', 'Tacna',
  'Tumbes', 'Ucayali'
] as const;

export function isValidUbigeo(ubigeo: string): boolean {
  return /^\d{6}$/.test(ubigeo);
}

export function getDepartmentFromUbigeo(ubigeo: string): string | null {
  if (!isValidUbigeo(ubigeo)) return null;
  const deptCode = parseInt(ubigeo.slice(0, 2), 10);
  if (deptCode >= 1 && deptCode <= 25) {
    return PERU_DEPARTMENTS[deptCode - 1];
  }
  return null;
}

export function formatPeruvianPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('51') && clean.length === 11) {
    return `+51 ${clean.slice(2, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  }
  if (clean.length === 9 && clean.startsWith('9')) {
    return `+51 ${clean.slice(0, 1)} ${clean.slice(1, 4)} ${clean.slice(4)}`;
  }
  return phone;
}

// ============================================
// FILE SIZE FORMATTING
// ============================================

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================
// COLOR HELPERS
// ============================================

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function getContrastColor(hex: string): '#000000' | '#ffffff' {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000000';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// ============================================
// EXPORTS
// ============================================

export type { Decimal };
export { Decimal as DecimalClass } from 'decimal.js';