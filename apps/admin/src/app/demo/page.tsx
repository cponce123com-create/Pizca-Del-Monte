import { notFound, redirect } from 'next/navigation';
import { isAdminDemo } from '@/lib/demo/mode';
import { closeDemoSession, hasDemoSession } from '@/lib/demo/session';
import { initialDemo } from '@/lib/demo/store';
import { DemoDashboard } from './dashboard';

export const dynamic = 'force-dynamic';

export default async function DemoPage() {
  if (!isAdminDemo()) notFound();
  if (!await hasDemoSession()) redirect('/login');

  async function logout() {
    'use server';
    await closeDemoSession();
    redirect('/login');
  }

  return <DemoDashboard initial={initialDemo()} logout={logout} />;
}
