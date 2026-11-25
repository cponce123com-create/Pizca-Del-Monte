import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@pizca/database';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { checkAuthRateLimits, getClientIp } from '@/lib/security/auth-rate-limit';

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Correo', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      authorize: async (credentials, request) => {
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(8),
          })
          .safeParse(credentials);

        if (!parsed.success) return null;

        const email = parsed.data.email.trim().toLowerCase();
        const { password } = parsed.data;

        const rateLimit = await checkAuthRateLimits([
          { scope: 'login:ip', identifier: getClientIp(request.headers) },
          { scope: 'login:identity', identifier: email },
        ]);
        if (rateLimit.status === 'limited') return null;
        if (rateLimit.status === 'unavailable') {
          throw new Error('Authentication rate limiting is unavailable');
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { roles: { include: { role: true } } },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) return null;

        if (user.status !== 'ACTIVE') return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar,
          roles: user.roles.map((ur) => ur.role.name),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = (user as { roles?: string[] }).roles ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.roles = token.roles as string[];
      }
      return session;
    },
  },
});
