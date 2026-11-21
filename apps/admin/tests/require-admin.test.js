const mockAuth = jest.fn();
const mockFindUser = jest.fn();
const mockRedirect = jest.fn(() => { throw new Error('redirect'); });
jest.mock('next/navigation', () => ({ redirect: (...args) => mockRedirect(...args) }));
jest.mock('@/lib/auth/config', () => ({ auth: (...args) => mockAuth(...args) }));
jest.mock('@pizca/database', () => ({ prisma: { user: { findUnique: (...args) => mockFindUser(...args) } } }));
const { requireAdmin } = require('../src/lib/auth/require-admin');
const user = { id: '1', status: 'ACTIVE', twoFactorEnabled: false, roles: [{ role: { name: 'ADMIN' }, expiresAt: null }] };
beforeEach(() => {
  jest.clearAllMocks();
  process.env.ADMIN_AUTH_SECRET = 'a'.repeat(40);
  delete process.env.AUTH_SECRET;
  delete process.env.NEXTAUTH_SECRET;
  mockAuth.mockResolvedValue({ user: { id: '1', email: 'admin@example.com' } });
  mockFindUser.mockResolvedValue(user);
});
test('verifica el usuario y rol vigentes en cada solicitud', async () => {
  expect(await requireAdmin()).toEqual(user);
  expect(mockFindUser.mock.calls[0][0].where).toEqual({ id: '1' });
});
test.each([
  ['sin sesión', null],
  ['cuenta eliminada', null],
  ['rol retirado', { ...user, roles: [] }],
  ['cuenta desactivada', { ...user, status: 'INACTIVE' }],
])('bloquea %s', async (label, value) => {
  if (label === 'sin sesión') mockAuth.mockResolvedValue(null);
  else mockFindUser.mockResolvedValue(value);
  await expect(requireAdmin()).rejects.toThrow('redirect');
  expect(mockRedirect).toHaveBeenCalledWith('/login');
});
