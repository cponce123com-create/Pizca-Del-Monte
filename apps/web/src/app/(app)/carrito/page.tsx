import { Metadata } from 'next';
import { CartClient } from './CartClient';
import { DemoCart } from './DemoCart';
import { isDemoMode } from '@/lib/demo-mode';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Carrito - Pizca del Monte',
  description: 'Revisa tu carrito de compras y procede al pago.',
};

export default function CartPage() {
  return isDemoMode() ? <DemoCart /> : <CartClient />;
}