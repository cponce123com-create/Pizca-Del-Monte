import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';
import { demoCategories, demoProducts } from '../../../apps/web/src/lib/demo-products';

/** Seed opcional y exclusivamente local. Nunca modifica datos existentes. */
async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.log(`Demo sin base de datos: ${demoProducts.length} productos disponibles en el fixture.`);
    return;
  }
  if (process.env.NODE_ENV === 'production') throw new Error('El seed de demostración no se ejecuta en producción.');
  const prisma = new PrismaClient();
  try {
    const customerEmail = 'cliente@test.pe';
    const existing = await prisma.user.findUnique({ where: { email: customerEmail } });
    const password = existing ? null : randomBytes(24).toString('base64url');
    const passwordHash = password ? await hash(password, 12) : null;
    await prisma.$transaction(async tx => {
      const brand = await tx.brand.upsert({ where: { slug: 'pizca-del-monte' }, update: {}, create: { name: 'Pizca del Monte', slug: 'pizca-del-monte' } });
      const categories = new Map<string, string>();
      for (const category of demoCategories) {
        const stored = await tx.category.upsert({ where: { slug: category.slug }, update: {}, create: { slug: category.slug, name: category.name, seoKeywords: [] } });
        categories.set(category.slug, stored.id);
      }
      for (const item of demoProducts) {
        const product = await tx.product.upsert({ where: { sku: item.sku }, update: {}, create: { sku: item.sku, slug: item.slug, name: item.name, shortDescription: item.shortDescription, description: item.description, status: 'ACTIVE', basePrice: item.basePrice, brandId: brand.id, trackInventory: false, metaKeywords: [] } });
        const categoryId = categories.get(item.categories[0].slug);
        if (!categoryId) throw new Error('Falta categoría demo');
        await tx.productCategory.upsert({ where: { productId_categoryId: { productId: product.id, categoryId } }, update: {}, create: { productId: product.id, categoryId, isPrimary: true } });
        await tx.productVariant.upsert({ where: { sku: item.variants[0].sku }, update: {}, create: { productId: product.id, sku: item.variants[0].sku, name: item.variants[0].name, price: item.basePrice, isDefault: true, trackInventory: false } });
        const media = await tx.productMedia.findFirst({ where: { productId: product.id, url: item.primaryImage.url } });
        if (!media) await tx.productMedia.create({ data: { productId: product.id, url: item.primaryImage.url, alt: item.primaryImage.alt, isPrimary: true } });
      }
      if (!existing && passwordHash) await tx.user.create({ data: { email: customerEmail, name: 'Cliente de prueba', status: 'ACTIVE', passwordHash } });
    }, { timeout: 60000 });
    if (password) console.log(`Cuenta local de prueba: ${customerEmail}\nContraseña generada (se muestra una sola vez): ${password}`);
    console.log(`Seed de desarrollo completado: ${demoProducts.length} productos referenciales.`);
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error('No se pudo ejecutar el seed:', error instanceof Error ? error.message : 'error desconocido'); process.exitCode = 1; });
