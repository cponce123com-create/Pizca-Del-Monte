import { isDemoMode } from '@/lib/demo-mode';
import { DemoAccountNotice } from '@/components/auth/demo-account-notice';
import RegisterClient from './RegisterClient';
export const dynamic = 'force-dynamic';
export default function RegisterPage() { return isDemoMode() ? <DemoAccountNotice /> : <RegisterClient />; }
