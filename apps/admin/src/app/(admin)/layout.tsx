import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/require-admin';
import { signOut } from '@/lib/auth/config';

export const dynamic = 'force-dynamic';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  async function logout() { 'use server'; await signOut({ redirectTo: '/login' }); }
  return <div className="min-h-screen bg-background">
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-4">
        <Link className="font-bold" href="/admin">Pizca Admin</Link>
        <nav className="flex flex-wrap gap-4 text-sm" aria-label="Administración">
          <Link href="/admin">Resumen</Link><Link href="/admin/productos">Productos</Link>
          <Link href="/admin/inventario">Inventario</Link>
          <Link href="/admin/pedidos">Pedidos</Link>
          <Link href="/admin/clientes">Clientes</Link>
          <Link href="/admin/contenido">Contenido</Link>
          <Link href="/admin/operaciones">Operaciones</Link>
          <Link href="/admin/auditoria">Auditoría</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm"><span>{user.name || user.email}</span><form action={logout}><button type="submit" className="underline">Salir</button></form></div>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
  </div>;
}
