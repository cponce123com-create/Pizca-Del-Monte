import { Prisma, PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';

// Configuración global para Prisma Client en desarrollo (evita múltiples instancias en hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Extensiones de Prisma para tipos personalizados
export const prismaWithExtensions = prisma.$extends({
  name: 'pizca-extensions',
  model: {
    // Helpers para Product
    product: {
      async findActiveBySlug(slug: string) {
        return prisma.product.findFirst({
          where: { slug, status: 'ACTIVE' },
          include: {
            brand: true,
            categories: { include: { category: true } },
            variants: { include: { attributes: { include: { attribute: true, attributeValue: true } } } },
            media: { orderBy: { sortOrder: 'asc' } },
            inventory: true,
          },
        });
      },
      async findWithRelations(id: string) {
        return prisma.product.findUnique({
          where: { id },
          include: {
            brand: true,
            categories: { include: { category: true } },
            collections: { include: { collection: true } },
            variants: { include: { attributes: { include: { attribute: true, attributeValue: true } }, inventory: true } },
            media: { orderBy: { sortOrder: 'asc' } },
            inventory: true,
            attributes: { include: { attribute: true, attributeValue: true } },
            relatedProducts: { include: { related: { include: { media: { where: { isPrimary: true } } } } } },
            bundles: { include: { component: { include: { media: { where: { isPrimary: true } }, inventory: true } }, componentVariant: true } },
          },
        });
      },
    },
    // Helpers para Order
    order: {
      async findByNumber(orderNumber: string) {
        return prisma.order.findUnique({
          where: { orderNumber },
          include: {
            user: true,
            items: { include: { product: { include: { media: { where: { isPrimary: true } } } }, variant: true } },
            payments: true,
            shipments: { include: { carrier: true, events: { orderBy: { eventDate: 'asc' } } } },
            documents: true,
            statusHistory: { orderBy: { createdAt: 'asc' } },
            shippingAddressRel: true,
            billingAddressRel: true,
          },
        });
      },
      async findByGuestToken(token: string) {
        return prisma.order.findUnique({
          where: { guestToken: token },
          include: {
            items: { include: { product: { include: { media: { where: { isPrimary: true } } } }, variant: true } },
            payments: true,
            shipments: { include: { carrier: true, events: { orderBy: { eventDate: 'asc' } } } },
            documents: true,
            statusHistory: { orderBy: { createdAt: 'asc' } },
          },
        });
      },
    },
    // Helpers para Inventory
    inventoryItem: {
      async reserveStock(productId: string, quantity: number, variantId?: string, lotId?: string) {
        return prisma.$transaction(async (tx) => {
          const where = variantId ? { variantId } : { productId };
          const item = await tx.inventoryItem.findUnique({ where });
          if (!item) throw new Error('Inventario no encontrado');
          const available = item.availableQty - (lotId ? 0 : 0); // TODO: lógica por lote
          if (available < quantity) throw new Error('Stock insuficiente');
          return tx.inventoryItem.update({
            where: { id: item.id },
            data: { reservedQty: { increment: quantity }, availableQty: { decrement: quantity } },
          });
        });
      },
      async releaseReservation(productId: string, quantity: number, variantId?: string) {
        const where = variantId ? { variantId } : { productId };
        const item = await prisma.inventoryItem.findUnique({ where });
        if (!item) return;
        return prisma.inventoryItem.update({
          where: { id: item.id },
          data: { reservedQty: { decrement: quantity }, availableQty: { increment: quantity } },
        });
      },
      async confirmSale(productId: string, quantity: number, variantId?: string, lotId?: string) {
        return prisma.$transaction(async (tx) => {
          const where = variantId ? { variantId } : { productId };
          const item = await tx.inventoryItem.findUnique({ where });
          if (!item) throw new Error('Inventario no encontrado');
          // Decrementar reserved y quantity
          return tx.inventoryItem.update({
            where: { id: item.id },
            data: { quantity: { decrement: quantity }, reservedQty: { decrement: quantity } },
          });
        });
      },
    },
  },
  result: {
    product: {
      finalPrice: {
        needs: { basePrice: true, compareAtPrice: true },
        compute(product) {
          return product.compareAtPrice && product.compareAtPrice.gt(product.basePrice)
            ? product.compareAtPrice
            : product.basePrice;
        },
      },
      discountPercent: {
        needs: { basePrice: true, compareAtPrice: true },
        compute(product) {
          if (product.compareAtPrice && product.compareAtPrice.gt(product.basePrice)) {
            const discount = product.compareAtPrice.minus(product.basePrice).div(product.compareAtPrice).mul(100);
            return Math.round(discount.toNumber());
          }
          return 0;
        },
      },

    },
    order: {
      formattedTotal: {
        needs: { total: true, currency: true },
        compute(order) {
          return new Intl.NumberFormat('es-PE', { style: 'currency', currency: order.currency, minimumFractionDigits: 2 }).format(order.total.toNumber());
        },
      },
    },
    payment: {
      formattedAmount: {
        needs: { amount: true, currency: true },
        compute(payment) {
          return new Intl.NumberFormat('es-PE', { style: 'currency', currency: payment.currency, minimumFractionDigits: 2 }).format(payment.amount.toNumber());
        },
      },
    },
  },
});

// Helper para transacciones con reintentos
export async function withRetry<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options: { maxRetries?: number; retryDelay?: number } = {}
): Promise<T> {
  const { maxRetries = 3, retryDelay = 100 } = options;
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(fn, { maxWait: 5000, timeout: 10000 });
    } catch (error) {
      lastError = error as Error;
      // Reintentar solo en errores de concurrencia (P2034) o deadlock (P2034, P2035)
      const isRetryable =
        error instanceof Error &&
        (error.message.includes('P2034') || error.message.includes('P2035') || error.message.includes('deadlock'));
      if (!isRetryable || attempt === maxRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }
  throw lastError!;
}

// Helper para Decimal
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

// Tipos extendidos
export type PrismaClientExtended = typeof prismaWithExtensions;
export type PrismaTransaction = Prisma.TransactionClient;