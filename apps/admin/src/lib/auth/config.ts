import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from '@pizca/database';
import { z } from 'zod';

// Independiente de la sesión de clientes. El middleware mantiene el panel cerrado
// hasta completar las pruebas de seguridad y despliegue.
export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.ADMIN_AUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8 },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-pizca-admin.session-token' : 'pizca-admin.session-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' },
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production' ? '__Host-pizca-admin.csrf-token' : 'pizca-admin.csrf-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-pizca-admin.callback-url' : 'pizca-admin.callback-url',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' },
    },
  },
  pages: { signIn: '/login' },
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) (session.user as typeof session.user & { id: string }).id = token.sub;
      return session;
    },
  },
  providers: [Credentials({
    credentials: { email: {}, password: {} },
    async authorize(credentials) {
      if (!process.env.ADMIN_AUTH_SECRET || process.env.ADMIN_AUTH_SECRET.length < 32 || process.env.ADMIN_AUTH_SECRET === process.env.AUTH_SECRET || process.env.ADMIN_AUTH_SECRET === process.env.NEXTAUTH_SECRET) return null;
      const parsed = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(72) }).safeParse(credentials);
      if (!parsed.success || Buffer.byteLength(parsed.data.password, 'utf8') > 72) return null;
      const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() }, include: { roles: { include: { role: true } } } });
      if (!user || !user.passwordHash || user.status !== 'ACTIVE' || user.twoFactorEnabled || (user.lockedUntil && user.lockedUntil > new Date())) return null;
      const hasRole = user.roles.some(({ role, expiresAt }) => ['SUPERADMIN', 'ADMIN'].includes(role.name) && (!expiresAt || expiresAt > new Date()));
      if (!hasRole) return null;
      if (!(await compare(parsed.data.password, user.passwordHash))) {
        const updated = await prisma.user.update({ where: { id: user.id }, data: { loginAttempts: { increment: 1 } }, select: { loginAttempts: true } });
        if (updated.loginAttempts >= 5) await prisma.user.update({ where: { id: user.id }, data: { lockedUntil: new Date(Date.now() + 15 * 60 * 1000), loginAttempts: 0 } });
        return null;
      }
      await prisma.user.update({ where: { id: user.id }, data: { loginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() } });
      return { id: user.id, email: user.email, name: user.name };
    },
  })],
});
