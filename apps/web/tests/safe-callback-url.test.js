import { safeCallbackUrl } from '../src/lib/auth/safe-callback-url';

describe('safeCallbackUrl', () => {
  test('preserva una ruta local, query y fragmento', () => {
    expect(safeCallbackUrl('/mi-cuenta/pedidos?estado=reciente#lista'))
      .toBe('/mi-cuenta/pedidos?estado=reciente#lista');
  });

  test.each([
    null,
    undefined,
    '',
    'mi-cuenta',
    'https://example.com/phishing',
    '//example.com/phishing',
    '/\\\\example.com/phishing',
    'javascript:alert(1)',
    '/ruta\\\\externa',
    '/ruta\u0000invalida',
  ])('usa destino predeterminado para valor no confiable: %s', (value) => {
    expect(safeCallbackUrl(value)).toBe('/mi-cuenta');
  });
});
