import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckoutClient } from './CheckoutClient';

export const metadata: Metadata = {
  title: 'Checkout - Pizca del Monte',
  description: 'Completa tu compra de forma segura.',
};

export default async function CheckoutPage() {
  return <CheckoutClient />;
}