import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { isAdminDemo } from '@/lib/demo/mode';
import { openDemoSession } from '@/lib/demo/session';
import { signIn } from '@/lib/auth/config';

export const dynamic = 'force-dynamic';

async function login(formData: FormData) {
  'use server';
  if (isAdminDemo()) {
    const success = await openDemoSession(formData);
    redirect(success ? '/demo' : '/login?error=1');
  }
  try {
    await signIn('credentials', { email: formData.get('email'), password: formData.get('password'), redirectTo: '/admin' });
  } catch (error) {
    if (error instanceof AuthError) redirect('/login?error=1');
    throw error;
  }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const demo = isAdminDemo();
  return <main className="mx-auto max-w-md px-6 py-20">
    <h1 className="text-3xl font-bold">Administración</h1>
    <p className="mt-2 text-muted-foreground">{demo ? 'Demostración · Los datos se guardan en este navegador.' : 'Ingresa con una cuenta autorizada.'}</p>
    {error && <p role="alert" className="mt-4 text-red-700">No se pudo iniciar sesión. Revisa tus datos o inténtalo más tarde.</p>}
    <form action={login} className="mt-6 space-y-4">
      <label className="block">Correo<input name="email" type="email" autoComplete="username" required maxLength={254} className="input mt-1" /></label>
      <label className="block">Contraseña<input name="password" type="password" autoComplete="current-password" required maxLength={72} className="input mt-1" /></label>
      <button className="rounded-lg bg-primary px-5 py-3 text-primary-foreground" type="submit">Ingresar</button>
    </form>
  </main>;
}
