jest.mock('next/server', () => ({
  NextResponse: class extends Response {
    static next() { return new Response(null, { status: 200 }); }
  },
}));

const { middleware } = require('../src/middleware');
const original = process.env;

beforeEach(() => {
  process.env = { ...original };
  delete process.env.DATABASE_URL;
  delete process.env.ADMIN_AUTH_SECRET;
  delete process.env.AUTH_SECRET;
  delete process.env.NEXTAUTH_SECRET;
});

afterEach(() => { process.env = original; });

test('mantiene cerrado el panel sin configuración de base de datos', () => {
  expect(middleware().status).toBe(503);
});

test('rechaza un secreto compartido entre tienda y administración', () => {
  process.env.DATABASE_URL = 'postgresql://localhost/test';
  process.env.AUTH_SECRET = process.env.ADMIN_AUTH_SECRET = 'a'.repeat(40);
  expect(middleware().status).toBe(503);
});

test('deja que el panel configurado procese el inicio de sesión', () => {
  process.env.DATABASE_URL = 'postgresql://localhost/test';
  process.env.ADMIN_AUTH_SECRET = 'a'.repeat(40);
  expect(middleware().status).toBe(200);
});
