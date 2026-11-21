import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Compras en preparación - Pizca del Monte',
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <main className="container mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold">Estamos preparando las compras en línea</h1>
      <p className="mt-4 text-muted-foreground">
        El pago y el envío aún no están disponibles. Puedes seguir explorando y guardar productos en tu carrito.
      </p>
      <Link href="/tienda" className="mt-8 inline-block rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground">
        Volver a la tienda
      </Link>
    </main>
  );
}
