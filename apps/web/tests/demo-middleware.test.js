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

test('middleware permite favoritos sin redirigir cuando demo está activo', async () => {
  process.env.DEMO_MODE = 'true';
  jest.resetModules();
  jest.doMock('next-auth', () => ({ __esModule: true, default: () => ({ auth: handler => handler }) }));
  const { NextRequest } = require('next/server');
  const middleware = require('../src/middleware').default;
  const request = new NextRequest('http://localhost/favoritos');
  request.auth = null;
  const response = middleware(request);
  expect(response.status).toBe(200);
  expect(response.headers.get('location')).toBeNull();
});
