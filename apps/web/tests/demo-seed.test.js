import { execFileSync } from 'node:child_process';
import path from 'node:path';
test('el seed sin base de datos usa el fixture y no crea cuentas', () => {
  const env = { ...process.env, DEMO_MODE: 'true' }; delete env.DATABASE_URL;
  const cwd = path.resolve(process.cwd(), '../../packages/database');
  const output = execFileSync(process.execPath, ['--import', 'tsx', 'prisma/seed.ts'], { cwd, env, encoding: 'utf8' });
  expect(output).toContain('30 productos disponibles');
  expect(output).not.toContain('Contraseña generada');
});
