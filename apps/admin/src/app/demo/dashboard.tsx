'use client';

import { useEffect, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import { code39Image } from '@/lib/demo/barcode';
import {
  demoStorageKey, fields, moduleNames, recordLabel, saveRecord,
  type DemoStore, type Module, type RecordData,
} from '@/lib/demo/store';

type Props = { initial: DemoStore; logout: () => Promise<void> };
const navigation = Object.keys(moduleNames) as Module[];
const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
const primary = 'btn-primary px-4 py-2';
const secondary = 'btn-outline px-3 py-2';

function exportRows(module: Module, rows: RecordData[]) {
  const headings = fields[module];
  function escape(value: string) {
    const guarded = /^\s*[=+@\-\t\r]/.test(value) ? "'" + value : value;
    return '"' + guarded.replaceAll('"', '""') + '"';
  }
  const csv = [headings.map(field => escape(field.label)), ...rows.map(row => headings.map(field => escape(row[field.key] || '')))]
    .map(row => row.join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'pizca-demo-' + module + '.csv';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadImage(data: string, filename: string) {
  const link = document.createElement('a');
  link.href = data;
  link.download = filename;
  link.click();
}

function printCard(title: string, lines: string[], copies: number, images: { data: string; alt: string; width: number }[] = []) {
  const popup = window.open('', '_blank', 'width=740,height=650');
  if (!popup) throw Error('Autoriza la ventana de impresión y vuelve a intentar.');
  popup.opener = null;
  popup.document.title = title;
  popup.document.body.style.cssText = 'font: 14px system-ui; display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px';
  const loaded: Promise<void>[] = [];
  for (let index = 0; index < copies; index++) {
    const card = popup.document.createElement('article');
    card.style.cssText = 'border:1px solid #444;padding:16px;break-inside:avoid';
    for (const line of ['Pizca del Monte · DEMO', title, ...lines]) {
      const text = popup.document.createElement('p');
      text.textContent = line;
      card.append(text);
    }
    for (const image of images) {
      const img = popup.document.createElement('img');
      img.width = image.width;
      img.alt = image.alt;
      img.src = image.data;
      card.append(img);
      loaded.push(img.decode().catch(() => {}));
    }
    popup.document.body.append(card);
  }
  void Promise.all(loaded).then(() => { popup.focus(); popup.print(); });
}

export function DemoDashboard({ initial, logout }: Props) {
  const [store, setStore] = useState(initial);
  const [ready, setReady] = useState(false);
  const [module, setModule] = useState<Module | 'home'>('home');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<RecordData | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [label, setLabel] = useState<{ title: string; lines: string[]; copies: number; qr: string; barcode: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(demoStorageKey);
      if (saved) {
        const data: unknown = JSON.parse(saved);
        if (data && typeof data === 'object' && navigation.every(name => Array.isArray((data as DemoStore)[name]))) {
          setStore(data as DemoStore);
        }
      }
    } catch {
      setError('No se pudo leer el almacenamiento del navegador.');
    }
    setReady(true);
  }, []);

  function persist(next: DemoStore) {
    localStorage.setItem(demoStorageKey, JSON.stringify(next));
    setStore(next);
  }

  function navigate(target: Module | 'home') {
    setModule(target);
    setQuery('');
    setDraft(null);
    setNotice('');
    setError('');
    setLabel(null);
    setConfirmReset(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || module === 'home') return;
    setError('');
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const item = { ...values, id: draft.id } as RecordData;
      persist(saveRecord(store, module, item, new Date(), crypto.randomUUID()));
      setDraft(null);
      setNotice('Cambios guardados.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudieron guardar los cambios.');
    }
  }

  function openEdit(row: RecordData) {
    setError('');
    setNotice('');
    setDraft(row);
  }

  async function prepareLabel(row: RecordData) {
    const product = store.products.find(item => item.id === row.product);
    if (!product) return;
    try {
      setError('');
      const barcode = code39Image(product.sku);
      const qr = await QRCode.toDataURL(product.sku);
      setLabel({ title: row.name, lines: [product.name, 'SKU ' + product.sku], copies: Number(row.copies), qr, barcode });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo generar el código de la etiqueta.');
    }
  }

  async function downloadRecipeQr(row: RecordData) {
    const origin = process.env.NEXT_PUBLIC_APP_URL;
    if (!origin || !URL.canParse(origin)) {
      setError('Configura NEXT_PUBLIC_APP_URL con la URL pública de la tienda.');
      return;
    }
    try {
      const url = new URL('/recetas/' + encodeURIComponent(row.slug), origin);
      if (!['http:', 'https:'].includes(url.protocol)) throw Error('URL no admitida');
      const qr = await QRCode.toDataURL(url.href, { width: 512 });
      downloadImage(qr, row.slug + '-qr.png');
    } catch {
      setError('No se pudo generar el QR de la receta.');
    }
  }

  function printReceipt(row: RecordData) {
    try {
      printCard('Constancia ' + row.name, [
        'Sin validez fiscal', 'Pedido ' + recordLabel(store.orders.find(item => item.id === row.order)),
        'Fecha ' + row.date, 'Total ' + money.format(Number(row.total)),
      ], 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo abrir la impresión.');
    }
  }

  const matches = module === 'home' ? [] : store[module].filter(row =>
    fields[module].some(field => {
      const value = field.relation ? recordLabel(store[field.relation].find(item => item.id === row[field.key])) : row[field.key];
      return value?.toLocaleLowerCase('es-PE').includes(query.trim().toLocaleLowerCase('es-PE'));
    }),
  );
  const columns = module === 'home' ? [] : fields[module].filter(field => field.type !== 'textarea');

  return <div className="min-h-screen">
    <header className="border-b bg-background px-5 py-4">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <button className="font-bold" onClick={() => navigate('home')}>Pizca del Monte</button>
        <p className="text-sm text-muted-foreground">Demo · Datos de este navegador</p>
        <form action={logout}><button className={secondary} type="submit">Salir</button></form>
      </div>
    </header>
    <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-[12rem_minmax(0,1fr)]">
      <nav aria-label="Administración" className="flex flex-wrap content-start gap-1 md:grid">
        <button className={`rounded px-3 py-2 text-left ${module === 'home' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} onClick={() => navigate('home')}>Resumen</button>
        {navigation.map(name => <button key={name} aria-current={module === name ? 'page' : undefined} onClick={() => navigate(name)}
          className={`rounded px-3 py-2 text-left text-sm ${module === name ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
          {moduleNames[name]}
        </button>)}
      </nav>
      <main className="min-w-0 space-y-5">
        {error && <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-red-900">{error}</p>}
        {notice && <p role="status" className="rounded border p-3">{notice}</p>}
        {!ready ? <p role="status">Cargando datos…</p> : module === 'home' ? <>
          <h1 className="text-3xl font-bold">Resumen</h1>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(['products', 'orders', 'customers', 'shipments'] as const).map(name =>
              <button key={name} onClick={() => navigate(name)} className="card p-5 text-left">
                <span className="block text-sm text-muted-foreground">{moduleNames[name]}</span>
                <span className="text-3xl font-bold">{store[name].length}</span>
              </button>,
            )}
          </div>
          <h2 className="text-xl font-semibold">Actividad reciente</h2>
          {store.audit.length === 0 ? <p>Sin movimientos todavía.</p> :
            <ul className="grid gap-2">{store.audit.slice(0, 5).map(row => <li key={row.id} className="rounded border p-3">{row.name} · {row.content}</li>)}</ul>}
          {confirmReset ? <div className="space-x-3">
            <p className="mb-2">Se eliminarán los cambios guardados en este navegador.</p>
            <button className={secondary} onClick={() => setConfirmReset(false)}>Cancelar</button>
            <button className={primary} onClick={() => {
              try { persist(initial); setConfirmReset(false); setNotice('Datos demo restaurados.'); }
              catch { setError('No se pudo restaurar el almacenamiento.'); }
            }}>Restaurar datos</button>
          </div> : <button className={secondary} onClick={() => setConfirmReset(true)}>Restaurar demostración</button>}
        </> : <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-bold">{moduleNames[module]}</h1>
            <div className="flex flex-wrap gap-2">
              <button className={secondary} disabled={!matches.length} onClick={() => exportRows(module, matches)}>Exportar CSV</button>
              {module !== 'audit' && <button className={primary} onClick={() => openEdit({ id: crypto.randomUUID() })}>Nuevo registro</button>}
            </div>
          </div>
          {module === 'users' && <p className="text-sm text-muted-foreground">Usuarios de simulación. La cuenta de acceso demo es fija.</p>}
          {module === 'receipts' && <p className="text-sm text-muted-foreground">Constancias de práctica sin validez fiscal.</p>}
          {module === 'shipments' && <p className="text-sm text-muted-foreground">Seguimiento registrado manualmente.</p>}
          {draft && <form key={draft.id} className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2" onSubmit={submit}>
            <h2 className="text-lg font-semibold sm:col-span-2">{store[module].some(row => row.id === draft.id) ? 'Editar registro' : 'Nuevo registro'}</h2>
            {fields[module].map(field => {
              const options = field.relation
                ? store[field.relation].map(item => ({ id: item.id, name: recordLabel(item) }))
                : field.options?.map(item => ({ id: item, name: item }));
              return <label key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>{field.label}
                {options
                  ? <select className="input mt-1" name={field.key} defaultValue={draft[field.key] ?? (field.relation ? '' : options[0]?.id)} required={!field.optional}>
                    {field.relation && <option value="">Selecciona</option>}
                    {options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                  </select>
                  : field.type === 'textarea'
                    ? <textarea className="input mt-1" name={field.key} rows={3} maxLength={10000} defaultValue={draft[field.key]} required={!field.optional} />
                    : <input className="input mt-1" name={field.key} type={field.type ?? 'text'} step={field.type === 'number' ? '0.01' : undefined}
                      maxLength={300} min={field.type === 'number' ? 0 : undefined} defaultValue={draft[field.key]} required={!field.optional} />}
              </label>;
            })}
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" className={primary}>Guardar</button>
              <button type="button" className={secondary} onClick={() => setDraft(null)}>Cancelar</button>
            </div>
          </form>}
          <input className="input max-w-md" aria-label="Buscar registros" placeholder="Buscar…" value={query} onChange={event => setQuery(event.target.value)} />
          <div className="overflow-auto rounded-xl border">
            <table className="w-full min-w-max text-left text-sm">
              <thead><tr className="border-b bg-muted">
                {columns.map(field => <th className="p-3" scope="col" key={field.key}>{field.label}</th>)}
                {module === 'audit' && <th className="p-3" scope="col">Detalle</th>}
                {['orders', 'receipts'].includes(module) && <th className="p-3" scope="col">Total</th>}
                {module !== 'audit' && <th className="p-3" scope="col">Acciones</th>}
              </tr></thead>
              <tbody>{matches.map(row => <tr className="border-b last:border-0" key={row.id}>
                {columns.map(field => <td className="max-w-56 p-3" key={field.key}>
                  {field.relation ? recordLabel(store[field.relation].find(item => item.id === row[field.key])) : row[field.key]}
                </td>)}
                {module === 'audit' && <td className="p-3">{row.content}</td>}
                {['orders', 'receipts'].includes(module) && <td className="p-3">{money.format(Number(row.total))}</td>}
                {module !== 'audit' && <td className="space-x-3 p-3">
                  {row.id !== 'demo-admin' && <button className="underline" onClick={() => openEdit(row)}>Editar</button>}
                  {module === 'recipes' && row.status === 'Publicada' && <button className="underline" onClick={() => void downloadRecipeQr(row)}>Descargar QR</button>}
                  {module === 'labels' && <button className="underline" onClick={() => void prepareLabel(row)}>Vista de impresión</button>}
                  {module === 'receipts' && <button className="underline" onClick={() => printReceipt(row)}>Imprimir</button>}
                </td>}
              </tr>)}</tbody>
            </table>
            {matches.length === 0 && <p className="p-4 text-muted-foreground">Sin registros.</p>}
          </div>
          {label && <section className="grid gap-3 rounded-xl border p-4">
            <h2 className="font-bold">{label.title}</h2>
            <p>{label.lines.join(' · ')}</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- QR generado localmente como URL de datos */}
            <img src={label.qr} alt="QR del SKU" width={120} height={120} />
            {/* eslint-disable-next-line @next/next/no-img-element -- Code 39 generado localmente */}
            <img src={label.barcode} alt="Código de barras del SKU" width={220} />
            <div className="flex gap-2">
              <button className={primary} onClick={() => {
                try {
                  printCard(label.title, label.lines, label.copies, [
                    { data: label.qr, alt: 'Código QR', width: 92 },
                    { data: label.barcode, alt: 'Código de barras', width: 220 },
                  ]);
                }
                catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo abrir la impresión.'); }
              }}>Imprimir {label.copies} {label.copies === 1 ? 'copia' : 'copias'}</button>
              <button className={secondary} onClick={() => setLabel(null)}>Cerrar</button>
            </div>
          </section>}
        </>}
      </main>
    </div>
  </div>;
}
