import { saveProduct } from './actions';

type ProductValues = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: { toString(): string };
  status: string;
};

const labels = {
  DRAFT: 'Borrador', ACTIVE: 'Activo', ARCHIVED: 'Archivado',
  OUT_OF_STOCK: 'Agotado', DISCONTINUED: 'Descontinuado',
};

export function ProductForm({ product, error }: { product?: ProductValues; error?: string }) {
  return <form action={saveProduct.bind(null, product?.id ?? null)} className="grid gap-4 rounded-xl border p-5 sm:grid-cols-2">
    {error && <p role="alert" className="text-red-700 sm:col-span-2">
      {error === 'duplicate' ? 'El SKU o la URL ya están en uso.' : 'Revisa los campos e inténtalo de nuevo.'}
    </p>}
    <label className="grid gap-1">Nombre<input className="rounded border p-2" name="name" required maxLength={180} defaultValue={product?.name} /></label>
    <label className="grid gap-1">SKU<input className="rounded border p-2" name="sku" required maxLength={80} defaultValue={product?.sku} /></label>
    <label className="grid gap-1">Identificador de URL<input className="rounded border p-2" name="slug" required maxLength={160} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" defaultValue={product?.slug} /></label>
    <label className="grid gap-1">Precio base (S/)<input className="rounded border p-2" name="basePrice" required type="number" step="0.01" min="0" max="9999999999.99" defaultValue={product?.basePrice.toString()} /></label>
    <label className="grid gap-1">Estado<select className="rounded border p-2" name="status" defaultValue={product?.status ?? 'DRAFT'}>
      {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    <label className="grid gap-1 sm:col-span-2">Descripción<textarea className="rounded border p-2" name="description" rows={4} maxLength={10000} defaultValue={product?.description ?? ''} /></label>
    <button className="w-fit rounded bg-primary px-4 py-2 text-primary-foreground" type="submit">Guardar producto</button>
  </form>;
}
