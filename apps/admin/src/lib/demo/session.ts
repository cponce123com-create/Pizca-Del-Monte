import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { isAdminDemo } from './mode';

const cookieName = 'pizca-demo-admin';
const ttlSeconds = 8 * 60 * 60;
const runtime = globalThis as typeof globalThis & { pizcaDemoKey?: Buffer };

export const demoCredentials = { email: 'demo@pizcadelmonte.example', password: 'PizcaDemo-2026!' };

function sign(expiry: string) {
  const key = process.env.ADMIN_DEMO_SECRET || (runtime.pizcaDemoKey ??= randomBytes(32));
  return createHmac('sha256', key).update(expiry).digest();
}

export async function openDemoSession(form: FormData) {
  if (!isAdminDemo() ||
      String(form.get('email')).trim().toLowerCase() !== demoCredentials.email ||
      form.get('password') !== demoCredentials.password) return false;

  const expiry = String(Math.floor(Date.now() / 1000) + ttlSeconds);
  (await cookies()).set(cookieName, expiry + '.' + sign(expiry).toString('hex'), {
    httpOnly: true, sameSite: 'lax', path: '/demo',
    secure: process.env.NODE_ENV === 'production' && process.env.ADMIN_DEMO_HTTP !== 'true',
    maxAge: ttlSeconds,
  });
  return true;
}

export async function hasDemoSession() {
  if (!isAdminDemo()) return false;
  const value = (await cookies()).get(cookieName)?.value ?? '';
  const match = /^(\d{10})\.([0-9a-f]{64})$/.exec(value);
  if (!match || Number(match[1]) <= Date.now() / 1000) return false;
  return timingSafeEqual(sign(match[1]), Buffer.from(match[2], 'hex'));
}

export async function closeDemoSession() {
  (await cookies()).set(cookieName, '', { path: '/demo', maxAge: 0, httpOnly: true, sameSite: 'lax' });
}
