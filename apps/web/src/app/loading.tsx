export default function Loading() {
  return <div role="status" aria-label="Cargando contenido" className="container space-y-6 py-12"><div className="h-10 w-48 animate-pulse rounded bg-muted" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />)}</div></div>;
}
