import { readFileSync } from 'fs';
import path from 'path';
test('la configuración incluye HSTS y CSP en modo informe', () => {
  const config = readFileSync(path.join(process.cwd(), 'next.config.mjs'), 'utf8');
  expect(config).toContain('Strict-Transport-Security');
  expect(config).toContain('Content-Security-Policy-Report-Only');
});
