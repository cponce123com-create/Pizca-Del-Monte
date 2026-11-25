import { GET } from '@/app/api/products/route';
import { prisma } from '@pizca/database';
import { mockProducts, resetMocks } from '@/tests/setup';

// Mock NextRequest
function createMockRequest(searchParams?: Record<string, string>) {
  const url = new URL('http://localhost:3000/api/products');
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => url.searchParams.set(key, value));
  }
  return new Request(url.toString(), { method: 'GET' });
}

describe('/api/products', () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  it('returns paginated products with default parameters', async () => {
    jest.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);
    jest.mocked(prisma.product.count).mockResolvedValue(1);

    const request = createMockRequest();
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.products).toHaveLength(1);
    expect(data.products[0].name).toBe('Ají Amarillo');
    expect(data.products[0].formattedPrice).toBe('S/ 25.50');
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(12);
    expect(data.pagination.total).toBe(1);
    expect(data.pagination.totalPages).toBe(1);
  });

  it('applies pagination parameters', async () => {
    jest.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);
    jest.mocked(prisma.product.count).mockResolvedValue(25);

    const request = createMockRequest({ page: '2', limit: '10' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.pagination.page).toBe(2);
    expect(data.pagination.limit).toBe(10);
    expect(data.pagination.totalPages).toBe(3);
    expect(data.pagination.hasNext).toBe(true);
    expect(data.pagination.hasPrev).toBe(true);
  });

  it('filters by category slug', async () => {
    jest.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);
    jest.mocked(prisma.product.count).mockResolvedValue(1);

    const request = createMockRequest({ category: 'ajies' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categories: { some: { category: { slug: 'ajies' } } },
        }),
      })
    );
  });

  it('filters by brand slug', async () => {
    jest.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);
    jest.mocked(prisma.product.count).mockResolvedValue(1);

    const request = createMockRequest({ brand: 'pizca' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          brand: { slug: 'pizca' },
        }),
      })
    );
  });

  it('filters by price range', async () => {
    jest.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);
    jest.mocked(prisma.product.count).mockResolvedValue(1);

    const request = createMockRequest({ minPrice: '10', maxPrice: '50' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          basePrice: { gte: 10, lte: 50 },
        }),
      })
    );
  });

  it('returns 400 when minPrice > maxPrice', async () => {
    const request = createMockRequest({ minPrice: '100', maxPrice: '50' });
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('El precio mínimo no puede superar al máximo');
  });

  it('searches products by name, description, or SKU', async () => {
    jest.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);
    jest.mocked(prisma.product.count).mockResolvedValue(1);

    const request = createMockRequest({ search: 'ají' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { name: { contains: 'ají', mode: 'insensitive' } },
            { description: { contains: 'ají', mode: 'insensitive' } },
            { sku: { contains: 'ají', mode: 'insensitive' } },
          ]),
        }),
      })
    );
  });

  it('filters by inStock', async () => {
    jest.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);
    jest.mocked(prisma.product.count).mockResolvedValue(1);

    const request = createMockRequest({ inStock: 'true' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                { trackInventory: false },
                { inventory: { is: { availableQty: { gt: 0 } } } },
              ]),
            }),
          ]),
        }),
      })
    );
  });

  it('filters by featured', async () => {
    jest.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);
    jest.mocked(prisma.product.count).mockResolvedValue(1);

    const request = createMockRequest({ featured: 'true' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          featuredUntil: { gt: expect.any(Date) },
        }),
      })
    );
  });

  it('filters by onSale', async () => {
    jest.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);
    jest.mocked(prisma.product.count).mockResolvedValue(1);

    const request = createMockRequest({ onSale: 'true' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          compareAtPrice: { not: null, gt: 0 },
        }),
      })
    );
  });

  it('sorts by price ascending', async () => {
    jest.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);
    jest.mocked(prisma.product.count).mockResolvedValue(1);

    const request = createMockRequest({ sort: 'price_asc' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { basePrice: 'asc' },
      })
    );
  });

  it('sorts by price descending', async () => {
    jest.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);
    jest.mocked(prisma.product.count).mockResolvedValue(1);

    const request = createMockRequest({ sort: 'price_desc' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { basePrice: 'desc' },
      })
    );
  });

  it('sorts by name ascending', async () => {
    jest.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);
    jest.mocked(prisma.product.count).mockResolvedValue(1);

    const request = createMockRequest({ sort: 'name_asc' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { name: 'asc' },
      })
    );
  });

  it('sorts by popularity (order count)', async () => {
    jest.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);
    jest.mocked(prisma.product.count).mockResolvedValue(1);

    const request = createMockRequest({ sort: 'popular' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { orderItems: { _count: 'desc' } },
      })
    );
  });

  it('returns 500 on database error', async () => {
    jest.mocked(prisma.product.findMany).mockRejectedValue(new Error('DB Error'));
    jest.mocked(prisma.product.count).mockRejectedValue(new Error('DB Error'));

    const request = createMockRequest();
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Error interno del servidor');
  });

  it('returns products with correct formatting', async () => {
    jest.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);
    jest.mocked(prisma.product.count).mockResolvedValue(1);

    const request = createMockRequest();
    const response = await GET(request);

    const data = await response.json();
    const product = data.products[0];

    expect(product.id).toBe('prod_test_1');
    expect(product.sku).toBe('AJI-AMA-001');
    expect(product.name).toBe('Ají Amarillo');
    expect(product.slug).toBe('aji-amarillo');
    expect(product.basePrice).toBe(25.50);
    expect(product.compareAtPrice).toBe(30.00);
    expect(product.formattedPrice).toBe('S/ 25.50');
    expect(product.formattedCompareAtPrice).toBe('S/ 30.00');
    expect(product.discountPercent).toBe(15); // (30-25.5)/30 * 100 = 15%
    expect(product.brand).toEqual({ id: 'brand_1', name: 'Pizca', slug: 'pizca' });
    expect(product.categories).toHaveLength(1);
    expect(product.primaryImage).toEqual({ url: '/images/aji.jpg', alt: 'Ají' });
    expect(product.variants).toHaveLength(1);
    expect(product.variants[0].formattedPrice).toBe('S/ 25.50');
    expect(product.inStock).toBe(true);
  });
});