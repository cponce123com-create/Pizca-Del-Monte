import { Metadata } from 'next';
import { CartClient } from './CartClient';

export const metadata: Metadata = {
  title: 'Carrito - Pizca del Monte',
  description: 'Revisa tu carrito de compras y procede al pago.',
};

export default function CartPage() {
  return <CartClient />;
}