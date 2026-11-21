import { cn, formatPrice, slugify } from '../src/lib/utils';
import { formatPEN } from '@pizca/utils';
test('los formatos compartidos y los slugs siguen funcionando', () => {
  expect(formatPrice(18)).toBe(formatPEN(18));
  expect(slugify('Ají Amarillo')).toBe('aji-amarillo');
  expect(cn('p-2', 'p-4')).toBe('p-4');
});
