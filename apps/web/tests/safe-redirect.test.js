import { safeRedirect } from '../src/lib/safe-redirect';
test.each(['https://x.com', '//x.com', '/\\x.com', '/%2fexample.com', '/x?to=https://x.com', null])('rechaza redirección insegura %s', value => expect(safeRedirect(value)).toBe('/mi-cuenta'));
test('acepta una ruta interna', () => expect(safeRedirect('/ok')).toBe('/ok'));
