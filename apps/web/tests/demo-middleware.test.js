import { requiresSession } from '../src/lib/route-access';

afterEach(() => { delete process.env.DEMO_MODE; delete process.env.DATABASE_URL; });
test('favoritos en demo no necesita sesión, pero cuenta sí', () => {
  process.env.DEMO_MODE = 'true';
  expect(requiresSession('/favoritos')).toBe(false);
  expect(requiresSession('/favoritos/ejemplo')).toBe(false);
  expect(requiresSession('/cuenta')).toBe(true);
});
test('favoritos vuelve a estar protegido con base configurada', () => {
  process.env.DEMO_MODE = 'false'; process.env.DATABASE_URL = 'postgresql://host/db';
  expect(requiresSession('/favoritos')).toBe(true);
});
