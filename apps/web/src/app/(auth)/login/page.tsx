import { isDemoMode } from '@/lib/demo-mode';
import { DemoAccountNotice } from '@/components/auth/demo-account-notice';
import LoginClient from './LoginClient';
export const dynamic = 'force-dynamic';
export default function LoginPage() { return isDemoMode() ? <DemoAccountNotice /> : <LoginClient />; }
