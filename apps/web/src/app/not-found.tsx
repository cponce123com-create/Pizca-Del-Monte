import Link from 'next/link';
export default function NotFound() {
  return <main className="mx-auto max-w-xl px-6 py-24 text-center"><h1 className="text-3xl font-bold">Página no encontrada</h1><p className="mt-4">La dirección solicitada no existe.</p><Link className="mt-6 inline-block underline" href="/">Volver al inicio</Link></main>;
}
