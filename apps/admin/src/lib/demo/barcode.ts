// Code 39 symbol patterns. Each mask encodes nine alternating narrow/wide elements.
// Reference: ZXing Code39Reader (Apache-2.0), https://github.com/zxing/zxing.
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%*';
const patterns = [
  0x034, 0x121, 0x061, 0x160, 0x031, 0x130, 0x070, 0x025, 0x124, 0x064,
  0x109, 0x049, 0x148, 0x019, 0x118, 0x058, 0x00d, 0x10c, 0x04c, 0x01c,
  0x103, 0x043, 0x142, 0x013, 0x112, 0x052, 0x007, 0x106, 0x046, 0x016,
  0x181, 0x0c1, 0x1c0, 0x091, 0x190, 0x0d0, 0x085, 0x184, 0x0c4, 0x0a8,
  0x0a2, 0x08a, 0x02a, 0x094,
];

export function code39Image(sku: string) {
  if (!/^[0-9A-Z. $/+%\-]{1,24}$/.test(sku)) {
    throw Error('Para imprimir Code 39, usa un SKU de hasta 24 caracteres en mayúsculas.');
  }
  const bars: string[] = [];
  let x = 10;
  for (const symbol of '*' + sku + '*') {
    const mask = patterns[alphabet.indexOf(symbol)];
    for (let index = 0; index < 9; index++) {
      const width = (mask & (1 << (8 - index))) === 0 ? 1 : 3;
      if (index % 2 === 0) bars.push(`<rect x="${x}" width="${width}" height="42"/>`);
      x += width;
    }
    x++;
  }
  const width = x + 9;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 42"><rect width="${width}" height="42" fill="white"/>${bars.join('')}</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
