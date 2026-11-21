'use client';
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="es"><body><main style={{ padding: 40, textAlign: 'center' }}><h1>Ocurrió un error inesperado</h1><button onClick={reset}>Reintentar</button></main></body></html>;
}
