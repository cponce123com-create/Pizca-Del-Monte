const mockFindUser = jest.fn();
const mockUpdateUser = jest.fn();
const mockCompare = jest.fn();
let mockAuthorize;
jest.mock('@pizca/database', () => ({ prisma: { user: { findUnique: (...args) => mockFindUser(...args), update: (...args) => mockUpdateUser(...args) } } }));
jest.mock('bcryptjs', () => ({ compare: (...args) => mockCompare(...args) }));
jest.mock('next-auth/providers/credentials', () => ({ __esModule: true, default: options => options }));
jest.mock('next-auth', () => ({ __esModule: true, default: config => { mockAuthorize = config.providers[0].authorize; return {}; } }));
require('../src/lib/auth/config');

const credentials = { email: 'admin@example.com', password: 'contraseña' };
const admin = { id: '1', email: credentials.email, name: 'Admin', passwordHash: 'hash', status: 'ACTIVE', twoFactorEnabled: false, lockedUntil: null, roles: [{ role: { name: 'ADMIN' }, expiresAt: null }] };
beforeEach(() => {
  jest.clearAllMocks();
  process.env.ADMIN_AUTH_SECRET = 'a'.repeat(40);
  delete process.env.AUTH_SECRET;
  delete process.env.NEXTAUTH_SECRET;
  mockFindUser.mockResolvedValue(admin);
  mockCompare.mockResolvedValue(true);
  mockUpdateUser.mockResolvedValue({ loginAttempts: 1 });
});
test('admite solo administrador activo con clave correcta', async () => {
  expect(await mockAuthorize(credentials)).toEqual({ id: '1', email: credentials.email, name: 'Admin' });
});
test.each([
  ['usuario sin privilegios', { roles: [{ role: { name: 'SALES' }, expiresAt: null }] }],
  ['rol vencido', { roles: [{ role: { name: 'ADMIN' }, expiresAt: new Date(0) }] }],
  ['usuario desactivado', { status: 'INACTIVE' }],
  ['cuenta bloqueada', { lockedUntil: new Date(Date.now() + 60000) }],
  ['2FA aún no soportado', { twoFactorEnabled: true }],
])('rechaza %s', async (_name, override) => {
  mockFindUser.mockResolvedValue({ ...admin, ...override });
  expect(await mockAuthorize(credentials)).toBeNull();
});
test('rechaza secreto compartido y no consulta la base', async () => {
  process.env.AUTH_SECRET = process.env.ADMIN_AUTH_SECRET;
  expect(await mockAuthorize(credentials)).toBeNull();
  expect(mockFindUser).not.toHaveBeenCalled();
});
test('cuenta contraseñas fallidas y bloquea al quinto intento', async () => {
  mockCompare.mockResolvedValue(false);
  mockUpdateUser.mockResolvedValueOnce({ loginAttempts: 5 });
  expect(await mockAuthorize(credentials)).toBeNull();
  expect(mockUpdateUser).toHaveBeenCalledTimes(2);
  expect(mockUpdateUser.mock.calls[1][0].data.lockedUntil).toBeInstanceOf(Date);
});
