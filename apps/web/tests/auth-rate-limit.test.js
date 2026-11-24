const mockLimit = jest.fn();
const mockSlidingWindow = jest.fn((requests, window) => ({ requests, window }));

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({ mocked: true })),
}));

jest.mock('@upstash/ratelimit', () => {
  class MockRatelimit {
    constructor(options) {
      this.options = options;
    }

    limit(identifier) {
      return mockLimit(identifier);
    }

    static slidingWindow(requests, window) {
      return mockSlidingWindow(requests, window);
    }
  }

  return { Ratelimit: MockRatelimit };
});

function clearUpstashEnv() {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  clearUpstashEnv();
  process.env.NODE_ENV = 'test';
  process.env.NEXTAUTH_SECRET = 'test-secret';
});

test('extrae la IP del proxy y rechaza cabeceras de forwarding inválidas', () => {
  const { getClientIp } = require('../src/lib/security/auth-rate-limit');
  expect(getClientIp(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
  expect(getClientIp(new Headers({ 'x-forwarded-for': 'not-an-ip' }))).toBe('unknown');
  expect(getClientIp(new Headers({ 'x-real-ip': '2001:db8::1' }))).toBe('2001:db8::1');
});

test('permite desarrollo y tests sin Redis para no bloquear trabajo local', async () => {
  const { checkAuthRateLimits } = require('../src/lib/security/auth-rate-limit');
  await expect(checkAuthRateLimits([
    { scope: 'login:ip', identifier: '203.0.113.7' },
  ])).resolves.toEqual({ status: 'allowed' });
  expect(mockLimit).not.toHaveBeenCalled();
});

test('falla cerrado en producción si falta configurar Redis o el secreto de Auth.js', async () => {
  const { checkAuthRateLimits } = require('../src/lib/security/auth-rate-limit');
  process.env.NODE_ENV = 'production';
  await expect(checkAuthRateLimits([
    { scope: 'login:ip', identifier: '203.0.113.7' },
  ])).resolves.toEqual({ status: 'unavailable' });

  process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  delete process.env.NEXTAUTH_SECRET;
  await expect(checkAuthRateLimits([
    { scope: 'login:ip', identifier: '203.0.113.7' },
  ])).resolves.toEqual({ status: 'unavailable' });
});

test('aplica las cuotas distribuidas y devuelve Retry-After sin enviar el identificador en claro', async () => {
  process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  mockLimit.mockResolvedValue({ success: false, reset: Date.now() + 45_000 });
  const { checkAuthRateLimits } = require('../src/lib/security/auth-rate-limit');

  const result = await checkAuthRateLimits([
    { scope: 'login:ip', identifier: '203.0.113.7' },
    { scope: 'login:identity', identifier: 'CARLOS@example.com' },
  ]);

  expect(result.status).toBe('limited');
  expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(44);
  expect(result.retryAfterSeconds).toBeLessThanOrEqual(45);
  expect(mockLimit).toHaveBeenCalledTimes(2);
  for (const [key] of mockLimit.mock.calls) {
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(key).not.toContain('CARLOS');
    expect(key).not.toContain('203.0.113.7');
  }
});

test('deniega solicitudes en producción cuando Upstash no está disponible', async () => {
  process.env.NODE_ENV = 'production';
  process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  mockLimit.mockRejectedValue(new Error('simulated Redis outage'));
  const { checkAuthRateLimits } = require('../src/lib/security/auth-rate-limit');

  await expect(checkAuthRateLimits([
    { scope: 'register:ip', identifier: '203.0.113.7' },
  ])).resolves.toEqual({ status: 'unavailable' });
});
