import { redirect } from 'next/navigation';
import { prisma } from '@pizca/database';
import { auth } from './config';

// Consulta el estado y los roles en cada solicitud; no confía en roles del JWT.
export async function requireAdmin() {
  if (!process.env.ADMIN_AUTH_SECRET || process.env.ADMIN_AUTH_SECRET.length < 32 || process.env.ADMIN_AUTH_SECRET === process.env.AUTH_SECRET || process.env.ADMIN_AUTH_SECRET === process.env.NEXTAUTH_SECRET) redirect('/login');
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect('/login');
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
  if (!user || user.status !== 'ACTIVE' || user.twoFactorEnabled || !user.roles.some(({ role, expiresAt }) => ['SUPERADMIN', 'ADMIN'].includes(role.name) && (!expiresAt || expiresAt > new Date()))) redirect('/login');
  return user;
}
