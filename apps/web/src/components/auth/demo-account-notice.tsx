import Link from 'next/link';
export function DemoAccountNotice() {
  return <main className="mx-auto min-h-[60vh] max-w-xl px-5 py-16"><h1 className="font-heading text-3xl font-semibold">Cuentas en preparación</h1><p className="mt-4 text-muted-foreground">Las cuentas no están disponibles en la demostración.</p><Link className="mt-6 inline-block underline" href="/tienda">Volver a la tienda</Link></main>;
}
