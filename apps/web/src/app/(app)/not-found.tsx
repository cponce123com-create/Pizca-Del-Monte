import Link from 'next/link';
export default function NotFound() {
  return <div className="container max-w-xl py-24 text-center"><h1 className="font-heading text-3xl font-semibold">Página no encontrada</h1><p className="mt-4 text-muted-foreground">No encontramos la página solicitada.</p><Link href="/tienda" className="mt-6 inline-block rounded-lg bg-primary px-5 py-3 text-primary-foreground">Ir a la tienda</Link></div>;
}
