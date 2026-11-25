import { demoProducts } from '../../../../web/src/lib/demo-products';
import { demoRecipes } from '../../../../web/src/lib/demo-recipes';

export const moduleNames = {
  products: 'Productos', categories: 'Categorías', customers: 'Clientes', orders: 'Pedidos',
  inventory: 'Inventario', shipments: 'Envíos', receipts: 'Comprobantes', ledger: 'Contabilidad',
  recipes: 'Recetas', pages: 'Páginas', labels: 'Etiquetas', users: 'Usuarios', settings: 'Ajustes',
  audit: 'Auditoría',
} as const;

export type Module = keyof typeof moduleNames;
export type RecordData = { id: string } & Record<string, string>;
export type DemoStore = Record<Module, RecordData[]>;

type Field = { key: string; label: string; options?: readonly string[]; relation?: Module; type?: 'number' | 'email' | 'textarea' | 'date' | 'url'; optional?: boolean };
export const fields: Record<Module, Field[]> = {
  products: [
    { key: 'name', label: 'Nombre' }, { key: 'sku', label: 'SKU' }, { key: 'slug', label: 'Identificador de URL' },
    { key: 'category', label: 'Categoría', relation: 'categories' }, { key: 'price', label: 'Precio (S/)', type: 'number' },
    { key: 'description', label: 'Descripción', type: 'textarea' }, { key: 'status', label: 'Estado', options: ['Activo', 'Borrador', 'Archivado'] },
  ],
  categories: [{ key: 'name', label: 'Nombre' }, { key: 'description', label: 'Descripción', type: 'textarea', optional: true }],
  customers: [
    { key: 'name', label: 'Nombre' }, { key: 'email', label: 'Correo', type: 'email' }, { key: 'phone', label: 'Teléfono', optional: true },
    { key: 'type', label: 'Tipo', options: ['Minorista', 'Mayorista'] },
  ],
  orders: [
    { key: 'name', label: 'Número de pedido' }, { key: 'customer', label: 'Cliente', relation: 'customers' },
    { key: 'product', label: 'Producto', relation: 'products' }, { key: 'quantity', label: 'Cantidad', type: 'number' },
    { key: 'status', label: 'Estado', options: ['Pendiente', 'Confirmado', 'En preparación', 'Listo para envío', 'Enviado', 'Entregado', 'Cancelado'] },
  ],
  inventory: [
    { key: 'product', label: 'Producto', relation: 'products' }, { key: 'quantity', label: 'Existencias', type: 'number' },
    { key: 'reason', label: 'Motivo del ajuste' },
  ],
  shipments: [
    { key: 'order', label: 'Pedido', relation: 'orders' }, { key: 'carrier', label: 'Transportista' },
    { key: 'tracking', label: 'Número de seguimiento' }, { key: 'status', label: 'Estado', options: ['Pendiente', 'En tránsito', 'Entregado'] },
  ],
  receipts: [{ key: 'order', label: 'Pedido', relation: 'orders' }, { key: 'name', label: 'Número interno' }, { key: 'date', label: 'Fecha', type: 'date' }],
  ledger: [
    { key: 'name', label: 'Concepto' }, { key: 'date', label: 'Fecha', type: 'date' },
    { key: 'debit', label: 'Cuenta de cargo' }, { key: 'credit', label: 'Cuenta de abono' },
    { key: 'amount', label: 'Importe (S/)', type: 'number' },
  ],
  recipes: [
    { key: 'name', label: 'Título' }, { key: 'slug', label: 'Identificador de URL' },
    { key: 'description', label: 'Descripción', type: 'textarea' }, { key: 'ingredients', label: 'Ingredientes', type: 'textarea' },
    { key: 'steps', label: 'Preparación', type: 'textarea' }, { key: 'status', label: 'Estado', options: ['Borrador', 'Publicada'] },
  ],
  pages: [
    { key: 'name', label: 'Título' }, { key: 'slug', label: 'Identificador de URL' },
    { key: 'content', label: 'Contenido', type: 'textarea' }, { key: 'status', label: 'Estado', options: ['Borrador', 'Publicada'] },
  ],
  labels: [
    { key: 'product', label: 'Producto', relation: 'products' }, { key: 'name', label: 'Texto de etiqueta' },
    { key: 'copies', label: 'Copias', type: 'number' },
  ],
  users: [
    { key: 'name', label: 'Nombre' }, { key: 'email', label: 'Correo', type: 'email' },
    { key: 'role', label: 'Rol simulado', options: ['Superadmin', 'Administrador', 'Catálogo', 'Almacén', 'Ventas'] },
    { key: 'status', label: 'Estado', options: ['Activo', 'Suspendido'] },
  ],
  settings: [
    { key: 'name', label: 'Ajuste' }, { key: 'value', label: 'Valor' },
  ],
  audit: [{ key: 'date', label: 'Fecha' }, { key: 'name', label: 'Acción' }, { key: 'content', label: 'Detalle' }],
};

export function initialDemo(): DemoStore {
  const categories = new Map(demoProducts.flatMap(product => product.categories).map(category => [category.id, category]));
  return {
    products: demoProducts.map(product => ({
      id: product.id, name: product.name, sku: product.sku, slug: product.slug, category: product.categories[0].id,
      price: String(product.basePrice), description: product.description, status: 'Activo',
    })),
    categories: Array.from(categories.values(), category => ({ id: category.id, name: category.name, description: '' })),
    customers: [], orders: [], shipments: [], receipts: [], ledger: [], pages: [], labels: [], audit: [],
    inventory: demoProducts.map(product => ({ id: product.id, product: product.id, quantity: String(product.availableQty), reason: 'Catálogo demo' })),
    recipes: demoRecipes.map(recipe => ({
      id: recipe.slug, name: recipe.title, slug: recipe.slug, description: recipe.description,
      ingredients: recipe.ingredients.join('\n'), steps: recipe.steps.join('\n'), status: 'Publicada',
    })),
    users: [{ id: 'demo-admin', name: 'Superadmin demo', email: 'demo@pizcadelmonte.example', role: 'Superadmin', status: 'Activo' }],
    settings: [{ id: 'demo-store-name', name: 'Nombre de la tienda', value: 'Pizca del Monte' }],
  };
}

export const demoStorageKey = 'pizca-admin-demo-v1';

export function recordLabel(record: RecordData | undefined) {
  return record?.name || record?.tracking || record?.id || '—';
}

const orderTransitions: Record<string, string[]> = {
  Pendiente: ['Confirmado', 'Cancelado'],
  Confirmado: ['En preparación', 'Cancelado'],
  'En preparación': ['Listo para envío', 'Cancelado'],
  'Listo para envío': ['Enviado', 'Cancelado'],
  Enviado: ['Entregado'],
};

export function saveRecord(store: DemoStore, module: Module, draft: RecordData, now: Date, auditId: string): DemoStore {
  if (module === 'audit' || (module === 'users' && draft.id === 'demo-admin')) throw Error('Este registro está protegido.');
  let inventory = store.inventory;
  const previous = store[module].find(row => row.id === draft.id);
  const row: RecordData = { id: draft.id };
  for (const field of fields[module]) {
    const value = (draft[field.key] || '').trim();
    if (!value && !field.optional) throw Error('Completa el campo «' + field.label + '».');
    if (field.options && !field.options.includes(value)) throw Error('Selecciona un valor válido.');
    if (field.relation && !store[field.relation].some(item => item.id === value)) throw Error('Selecciona un registro existente.');
    if (field.type === 'number' && !/^\d{1,8}(?:\.\d{1,2})?$/.test(value)) throw Error('Ingresa un número válido.');
    if (field.key === 'slug' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) throw Error('Usa minúsculas, números y guiones en el identificador.');
    if (value.length > (field.type === 'textarea' ? 10000 : 300)) throw Error('El campo es demasiado largo.');
    row[field.key] = value;
  }

  const uniqueField: Partial<Record<Module, string[]>> = {
    products: ['sku', 'slug'], recipes: ['slug'], pages: ['slug'], orders: ['name'],
    receipts: ['name', 'order'], shipments: ['order', 'tracking'], users: ['email'], customers: ['email'], inventory: ['product'],
  };
  if (uniqueField[module]?.some(key => store[module].some(item => item.id !== row.id && item[key].toLowerCase() === row[key].toLowerCase()))) {
    throw Error('Ya existe un registro con ese identificador.');
  }

  if (module === 'inventory' && !Number.isSafeInteger(Number(row.quantity))) throw Error('Las existencias deben ser enteras.');
  if (module === 'labels' && (!Number.isInteger(Number(row.copies)) || Number(row.copies) < 1 || Number(row.copies) > 48)) {
    throw Error('Puedes imprimir entre 1 y 48 copias por hoja.');
  }
  if (module === 'orders') {
    if (!Number.isSafeInteger(Number(row.quantity)) || Number(row.quantity) < 1) throw Error('Ingresa una cantidad entera positiva.');
    if (!previous && row.status !== 'Pendiente') throw Error('Los pedidos nuevos comienzan en Pendiente.');
    if (previous && previous.status !== row.status && !orderTransitions[previous.status]?.includes(row.status)) {
      throw Error('Ese cambio de estado no corresponde al flujo del pedido.');
    }
    const product = store.products.find(item => item.id === row.product);
    if (!product) throw Error('Selecciona un producto.');
    if (previous && previous.status !== 'Pendiente' &&
        (previous.product !== row.product || previous.quantity !== row.quantity || previous.customer !== row.customer)) {
      throw Error('El cliente y el detalle quedan registrados al confirmar el pedido.');
    }
    const reserve = previous?.status === 'Pendiente' && row.status === 'Confirmado';
    const release = previous && !['Pendiente', 'Cancelado'].includes(previous.status) && row.status === 'Cancelado';
    if (reserve || release) {
      const stock = inventory.find(item => item.product === row.product);
      const quantity = Number(stock?.quantity ?? 0) + Number(row.quantity) * (reserve ? -1 : 1);
      if (!stock || quantity < 0) throw Error('Existencias insuficientes para confirmar el pedido.');
      inventory = inventory.map(item => item.id === stock.id
        ? { ...item, quantity: String(quantity), reason: (reserve ? 'Confirmación ' : 'Cancelación ') + row.name }
        : item);
    }
    row.unitPrice = previous?.product === row.product ? previous.unitPrice : product.price;
    row.total = (Math.round(Number(row.unitPrice) * 100) * Number(row.quantity) / 100).toFixed(2);
  }
  if (module === 'shipments') {
    const order = store.orders.find(item => item.id === row.order);
    if (!order || !['Listo para envío', 'Enviado', 'Entregado'].includes(order.status)) {
      throw Error('El pedido debe estar listo para envío.');
    }
  }
  if (module === 'receipts') {
    const order = store.orders.find(item => item.id === row.order);
    if (!order || ['Pendiente', 'Cancelado'].includes(order.status)) throw Error('El pedido debe estar confirmado.');
    row.total = order.total;
  }
  if (module === 'ledger' && (Number(row.amount) <= 0 || row.debit.toLowerCase() === row.credit.toLowerCase())) {
    throw Error('Ingresa un importe positivo y dos cuentas distintas.');
  }

  const action = previous ? 'Editar' : 'Crear';
  const detail = module === 'inventory' ? `${previous?.quantity ?? '0'} → ${row.quantity} · ${row.reason}` : recordLabel(row);
  return {
    ...store,
    inventory,
    [module]: previous ? store[module].map(item => item.id === row.id ? row : item) : [...store[module], row],
    audit: [{ id: auditId, date: now.toISOString(), name: `${action} · ${moduleNames[module]}`, content: detail }, ...store.audit].slice(0, 500),
  };
}
