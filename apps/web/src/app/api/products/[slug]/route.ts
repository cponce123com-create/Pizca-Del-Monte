import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pizca/database';
import { formatPEN } from '@pizca/utils';
import { isDemoMode } from '@/lib/demo-mode';
import { demoProducts } from '@/lib/demo-products';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (isDemoMode()) {
      const product = demoProducts.find(item => item.slug === slug);
      return product ? NextResponse.json(product, { headers: { 'Cache-Control': 'no-store' } }) : NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const product = await prisma.product.findFirst({
      where: {
        slug,
        status: 'ACTIVE',
      },
      include: {
        brand: true,
        categories: { include: { category: true } },
        media: { orderBy: { sortOrder: 'asc' } },
        variants: {
          
          include: {
            inventory: true,
            attributes: { include: { attribute: true, attributeValue: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
        inventory: true,
        reviews: {
          where: { isApproved: true },
          include: { user: { select: { name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { reviews: { where: { isApproved: true } } },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Calcular promedio sobre todas las reseñas aprobadas, no solo las últimas 10.
    const ratingStats = await prisma.review.aggregate({
      where: { productId: product.id, isApproved: true },
      _avg: { rating: true },
    });
    const avgRating = ratingStats._avg.rating ?? 0;

    // Formatear variantes con atributos agrupados
    const variants = product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      price: v.price?.toNumber() || product.basePrice.toNumber(),
      formattedPrice: formatPEN(v.price || product.basePrice),
      compareAtPrice: v.compareAtPrice?.toNumber() || null,
      formattedCompareAtPrice: v.compareAtPrice ? formatPEN(v.compareAtPrice) : null,
      discountPercent: v.compareAtPrice && v.compareAtPrice.gt(v.price || product.basePrice)
        ? Math.round(v.compareAtPrice.minus(v.price || product.basePrice).div(v.compareAtPrice).mul(100).toNumber())
        : 0,
      weight: v.weight?.toNumber(),
      trackInventory: v.trackInventory,
      inStock: v.trackInventory ? (v.inventory?.availableQty || 0) > 0 : true,
      availableQty: v.inventory?.availableQty || 0,
      maxQty: v.trackInventory ? Math.max(0, v.inventory?.availableQty ?? 0) : 99,
      attributes: v.attributes.map((a) => ({
        attributeId: a.attribute.id,
        attributeName: a.attribute.name,
        attributeSlug: a.attribute.slug,
        valueId: a.attributeValue.id,
        value: a.attributeValue.value,
        displayValue: a.attributeValue.value,
        color: a.attributeValue.color,
      })),
      media: product.media.map((m) => ({
        id: m.id,
        url: m.url,
        alt: m.alt || product.name,
        type: m.type,
        sortOrder: m.sortOrder,
      })),
    }));

    // Agrupar atributos por tipo para selector
    const attributeGroups = new Map<string, { name: string; slug: string; values: Map<string, { value: string; displayValue: string; color: string | null; variantIds: string[] }> }>();

    variants.forEach((variant) => {
      variant.attributes.forEach((attr) => {
        const key = attr.attributeSlug;
        if (!attributeGroups.has(key)) {
          attributeGroups.set(key, {
            name: attr.attributeName,
            slug: attr.attributeSlug,
            values: new Map(),
          });
        }
        const group = attributeGroups.get(key)!;
        const valueKey = attr.value;
        if (!group.values.has(valueKey)) {
          group.values.set(valueKey, {
            value: attr.value,
            displayValue: attr.displayValue,
            color: attr.color,
            variantIds: [],
          });
        }
        group.values.get(valueKey)!.variantIds.push(variant.id);
      });
    });

    const formattedAttributeGroups = Array.from(attributeGroups.entries()).map(([slug, group]) => ({
      slug,
      name: group.name,
      values: Array.from(group.values.entries()).map(([value, data]) => ({
        value,
        displayValue: data.displayValue,
        color: data.color,
        variantIds: data.variantIds,
      })),
    }));

    const formattedProduct = {
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
      weight: product.weight?.toNumber(),
      dimensions: { length: product.length?.toNumber() ?? null, width: product.width?.toNumber() ?? null, height: product.height?.toNumber() ?? null },
      brand: product.brand ? { id: product.brand.id, name: product.brand.name, slug: product.brand.slug, logo: product.brand.logo } : null,
      categories: product.categories.map((c) => ({
        id: c.category.id,
        name: c.category.name,
        slug: c.category.slug,
        isPrimary: c.isPrimary,
      })),
      media: product.media.map((m) => ({
        id: m.id,
        url: m.url,
        alt: m.alt || product.name,
        type: m.type,
        sortOrder: m.sortOrder,
      })),
      variants,
      attributeGroups: formattedAttributeGroups,
      inventory: product.inventory ? {
        totalQty: product.inventory.quantity,
        reservedQty: product.inventory.reservedQty,
        availableQty: product.inventory.availableQty,
        lowStockThreshold: product.inventory.minStock,
      } : null,
      trackInventory: product.trackInventory,
      inStock: product.variants.length > 0
        ? variants.some(variant => variant.inStock)
        : (!product.trackInventory || (product.inventory?.availableQty || 0) > 0),
      availableQty: product.variants.length > 0
        ? variants.reduce((total, variant) => total + variant.availableQty, 0)
        : (product.inventory?.availableQty || 0),
      isNew: Boolean(product.publishedAt && product.publishedAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      isBestseller: false,
      isFeatured: Boolean(product.featuredUntil && product.featuredUntil > new Date()),
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: product._count.reviews,
      reviews: product.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.content,
        createdAt: r.createdAt.toISOString(),
        user: { name: r.user.name, image: r.user.avatar },
        verifiedPurchase: r.isVerified,
      })),
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
      tags: product.metaKeywords,
      relatedProducts: [], // Se llenaría con una query separada
    };

    return NextResponse.json(formattedProduct);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}