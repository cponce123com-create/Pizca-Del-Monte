import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { z } from 'zod';
import { formatPEN } from '@pizca/utils';

const querySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(12),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name_asc', 'name_desc', 'popular']).default('newest'),
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  search: z.string().optional(),
  inStock: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  onSale: z.coerce.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { page, limit, sort, category, brand, minPrice, maxPrice, search, inStock, featured, onSale } = parsed.data;
    const skip = (page - 1) * limit;

    // Construir where
    const where: any = {
      status: 'ACTIVE',
    };

    if (category) {
      where.categories = { some: { category: { slug: category } } };
    }

    if (brand) {
      where.brand = { slug: brand };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.basePrice = {};
      if (minPrice !== undefined) where.basePrice.gte = minPrice;
      if (maxPrice !== undefined) where.basePrice.lte = maxPrice;
    }

    if (inStock) {
      where.AND = [...(where.AND || []), { OR: [
        { trackInventory: false },
        { inventory: { is: { availableQty: { gt: 0 } } } },
      ] }];
    }

    if (featured) {
      where.featuredUntil = { gt: new Date() };
    }

    if (onSale) {
      where.compareAtPrice = { not: null, gt: 0 };
    }

    // OrderBy
    let orderBy: any = { publishedAt: 'desc' };
    switch (sort) {
      case 'price_asc':
        orderBy = { basePrice: 'asc' };
        break;
      case 'price_desc':
        orderBy = { basePrice: 'desc' };
        break;
      case 'name_asc':
        orderBy = { name: 'asc' };
        break;
      case 'name_desc':
        orderBy = { name: 'desc' };
        break;
      case 'popular':
        orderBy = { orderItems: { _count: 'desc' } };
        break;
    }

    // Ejecutar queries en paralelo
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          brand: true,
          categories: { include: { category: true } },
          media: { where: { isPrimary: true }, take: 1 },
          variants: {
            
            include: {
              inventory: true,
              attributes: { include: { attribute: true, attributeValue: true } },
            },
          },
          inventory: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Formatear respuesta
    const formattedProducts = products.map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      description: product.description,
      type: product.type,
      basePrice: product.basePrice.toNumber(),
      compareAtPrice: product.compareAtPrice?.toNumber() || null,
      formattedPrice: formatPEN(product.basePrice),
      formattedCompareAtPrice: product.compareAtPrice ? formatPEN(product.compareAtPrice) : null,
      discountPercent: product.compareAtPrice && product.compareAtPrice.gt(product.basePrice)
        ? Math.round(product.compareAtPrice.minus(product.basePrice).div(product.compareAtPrice).mul(100).toNumber())
        : 0,
      brand: product.brand ? { id: product.brand.id, name: product.brand.name, slug: product.brand.slug } : null,
      categories: product.categories.map((c) => ({
        id: c.category.id,
        name: c.category.name,
        slug: c.category.slug,
        isPrimary: c.isPrimary,
      })),
      primaryImage: product.media[0] ? {
        url: product.media[0].url,
        alt: product.media[0].alt || product.name,
      } : null,
      variants: product.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        price: v.price?.toNumber() || product.basePrice.toNumber(),
        formattedPrice: formatPEN(v.price || product.basePrice),
        weight: v.weight?.toNumber(),
        inStock: v.trackInventory ? (v.inventory?.availableQty || 0) > 0 : true,
        availableQty: v.inventory?.availableQty || 0,
        attributes: v.attributes.map((a) => ({
          name: a.attribute.name,
          value: a.attributeValue.value,
        })),
      })),
      inStock: !product.trackInventory || (product.inventory?.availableQty || 0) > 0,
      availableQty: product.inventory?.availableQty || 0,
      trackInventory: product.trackInventory,
      isNew: Boolean(product.publishedAt && product.publishedAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      isBestseller: false, // Se calcularía con analytics
    }));

    return NextResponse.json({
      products: formattedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}