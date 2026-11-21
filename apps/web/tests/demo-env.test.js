test('la configuración mínima permite iniciar la demo sin base ni credenciales', () => {
  jest.resetModules();
  delete process.env.DATABASE_URL;
  process.env.DEMO_MODE = 'true';
  delete process.env.NEXT_PUBLIC_APP_URL;
  const { getEnv } = require('@pizca/config');
  expect(getEnv().DEMO_MODE).toBe('true');
  delete process.env.DEMO_MODE;
});
