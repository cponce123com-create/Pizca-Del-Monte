const mockFindUser = jest.fn();
const mockCompare = jest.fn();
const mockCheckAuthRateLimits = jest.fn();
const mockGetClientIp = jest.fn();
let mockAuthorize;

jest.mock('@pizca/database', () => ({
  prisma: { user: { findUnique: (...args) => mockFindUser(...args) } },
}));
jest.mock('bcryptjs', () => ({ compare: (...args) => mockCompare(...args) }));
jest.mock('@/lib/security/auth-rate-limit', () => ({
  checkAuthRateLimits: (...args) => mockCheckAuthRateLimits(...args),
  getClientIp: (...args) => mockGetClientIp(...args),
}));
jest.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: (options) => options,
}));
jest.mock('next-auth', () => ({
  __esModule: true,
  default: (config) => {
    mockAuthorize = config.providers[0].authorize;
    return {};
  },
}));

require('../src/lib/auth/config');

const user = {
  id: 'user-1',
  email: 'carlos@example.com',
  name: 'Carlos',
  avatar: null,
  passwordHash: 'bcrypt-hash',
  status: 'ACTIVE',
  roles: [{ role: { name: 'CUSTOMER' } }],
};
const credentials = { email: 'Carlos@Example.com', password: 'StrongPass123' };
const request = { headers: new Headers({ 'x-forwarded-for': '198.51.100.8' }) };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetClientIp.mockReturnValue('198.51.100.8');
  mockCheckAuthRateLimits.mockResolvedValue({ status: 'allowed' });
  mockFindUser.mockResolvedValue(user);
  mockCompare.mockResolvedValue(true);
});

test('limita por IP y correo normalizado antes de verificar la contraseña', async () => {
  const result = await mockAuthorize(credentials, request);

  expect(result).toMatchObject({ id: 'user-1', email: 'carlos@example.com' });
  expect(mockCheckAuthRateLimits).toHaveBeenCalledWith([
    { scope: 'login:ip', identifier: '198.51.100.8' },
    { scope: 'login:identity', identifier: 'carlos@example.com' },
  ]);
  expect(mockFindUser).toHaveBeenCalledWith(expect.objectContaining({ where: { email: 'carlos@example.com' } }));
});

test('un intento limitado no consulta la base ni compara contraseñas', async () => {
  mockCheckAuthRateLimits.mockResolvedValue({ status: 'limited', retryAfterSeconds: 300 });

  await expect(mockAuthorize(credentials, request)).resolves.toBeNull();
  expect(mockFindUser).not.toHaveBeenCalled();
  expect(mockCompare).not.toHaveBeenCalled();
});

test('falla cerrado si el servicio de rate limiting no está disponible en producción', async () => {
  mockCheckAuthRateLimits.mockResolvedValue({ status: 'unavailable' });

  await expect(mockAuthorize(credentials, request)).rejects.toThrow('Authentication rate limiting is unavailable');
  expect(mockFindUser).not.toHaveBeenCalled();
  expect(mockCompare).not.toHaveBeenCalled();
});

test('un correo y contraseña incorrectos siguen devolviendo un fallo genérico', async () => {
  mockCompare.mockResolvedValue(false);

  await expect(mockAuthorize(credentials, request)).resolves.toBeNull();
  expect(mockFindUser).toHaveBeenCalledTimes(1);
});
