const mockFindUser = jest.fn();
const mockCreateUser = jest.fn();
const mockCreateCustomer = jest.fn();
const mockHash = jest.fn();
const mockCheckAuthRateLimits = jest.fn();
const mockGetClientIp = jest.fn();

jest.mock('@pizca/database', () => ({
  prisma: {
    user: {
      findUnique: (...args) => mockFindUser(...args),
      create: (...args) => mockCreateUser(...args),
    },
    customer: { create: (...args) => mockCreateCustomer(...args) },
  },
}));
jest.mock('bcryptjs', () => ({ hash: (...args) => mockHash(...args) }));
jest.mock('@/lib/demo-mode', () => ({ isDemoMode: () => false }));
jest.mock('@/lib/security/auth-rate-limit', () => ({
  checkAuthRateLimits: (...args) => mockCheckAuthRateLimits(...args),
  getClientIp: (...args) => mockGetClientIp(...args),
}));

const { NextRequest } = require('next/server');
const { POST } = require('../src/app/api/auth/register/route');

const registration = {
  firstName: 'Carlos',
  lastName: 'Ponce',
  email: 'Carlos@Example.com',
  password: 'StrongPass123',
  phone: '',
  newsletter: false,
};

function request(body = registration) {
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '198.51.100.8',
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetClientIp.mockReturnValue('198.51.100.8');
  mockCheckAuthRateLimits.mockResolvedValue({ status: 'allowed' });
  mockFindUser.mockResolvedValue(null);
  mockHash.mockResolvedValue('password-hash');
  mockCreateUser.mockResolvedValue({ id: 'user-1' });
  mockCreateCustomer.mockResolvedValue({ id: 'customer-1' });
});

test('rechaza la cuota de IP antes de procesar o persistir el registro', async () => {
  mockCheckAuthRateLimits.mockResolvedValueOnce({ status: 'limited', retryAfterSeconds: 120 });

  const response = await POST(request());

  expect(response.status).toBe(429);
  expect(response.headers.get('retry-after')).toBe('120');
  expect(mockFindUser).not.toHaveBeenCalled();
  expect(mockCreateUser).not.toHaveBeenCalled();
});

test('falla cerrado con 503 cuando el limitador distribuido no está disponible', async () => {
  mockCheckAuthRateLimits.mockResolvedValueOnce({ status: 'unavailable' });

  const response = await POST(request());

  expect(response.status).toBe(503);
  expect(response.headers.get('retry-after')).toBe('60');
  expect(mockCreateUser).not.toHaveBeenCalled();
});

test('limita por correo normalizado después de validar el JSON', async () => {
  mockCheckAuthRateLimits
    .mockResolvedValueOnce({ status: 'allowed' })
    .mockResolvedValueOnce({ status: 'limited', retryAfterSeconds: 240 });

  const response = await POST(request());

  expect(response.status).toBe(429);
  expect(response.headers.get('retry-after')).toBe('240');
  expect(mockCheckAuthRateLimits).toHaveBeenNthCalledWith(1, [
    { scope: 'register:ip', identifier: '198.51.100.8' },
  ]);
  expect(mockCheckAuthRateLimits).toHaveBeenNthCalledWith(2, [
    { scope: 'register:identity', identifier: 'carlos@example.com' },
  ]);
  expect(mockFindUser).not.toHaveBeenCalled();
});

test('crea una cuenta tras superar las cuotas por IP y correo', async () => {
  const response = await POST(request());

  expect(response.status).toBe(201);
  expect(mockFindUser).toHaveBeenCalledWith({ where: { email: 'carlos@example.com' } });
  expect(mockCreateUser).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ email: 'carlos@example.com', passwordHash: 'password-hash' }),
  }));
  expect(mockCreateCustomer).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ email: 'carlos@example.com' }),
  }));
});
