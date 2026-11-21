import { logger } from '../src/lib/logger';
test('el logger no imprime detalles durante pruebas', () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  logger.error('fallo', new Error('detalle'));
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
});
