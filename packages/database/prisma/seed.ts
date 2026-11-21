import { PrismaClient, Role, Permission, UserStatus, ProductStatus, ProductType, OrderStatus, PaymentStatus, PaymentMethod, ShipmentStatus, InventoryMovementType, LotStatus, CouponType, PromotionType, TaxType, DocumentType, AccountingEntryType, CashMovementType, NotificationType, NotificationChannel } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de Pizca del Monte...');

  // ============================================
  // 1. ROLES Y PERMISOS
  // ============================================
  console.log('📋 Creando roles y permisos...');

  const allPermissions = Object.values(Permission);
  const rolePermissions: Record<Role, Permission[]> = {
    SUPERADMIN: allPermissions,
    ADMIN: allPermissions.filter(p => !p.includes('ROLE_MANAGE') && !p.includes('INTEGRATION_CONFIGURE')),
    CATALOG: [
      Permission.PRODUCT_CREATE, Permission.PRODUCT_READ, Permission.PRODUCT_UPDATE, Permission.PRODUCT_DELETE,
      Permission.CATEGORY_MANAGE, Permission.COLLECTION_MANAGE, Permission.BRAND_MANAGE,
      Permission.ATTRIBUTE_MANAGE, Permission.MEDIA_UPLOAD,
      Permission.PRICE_MANAGE, Permission.PROMOTION_MANAGE, Permission.COUPON_MANAGE, Permission.TAX_MANAGE,
    ],
    WAREHOUSE: [
      Permission.INVENTORY_READ, Permission.INVENTORY_UPDATE, Permission.STOCK_MOVEMENT_CREATE,
      Permission.LOT_MANAGE, Permission.SUPPLIER_MANAGE, Permission.PURCHASE_ORDER_MANAGE,
      Permission.PHYSICAL_COUNT, Permission.LABEL_TEMPLATE_MANAGE, Permission.QR_GENERATE,
      Permission.BARCODE_GENERATE, Permission.LABEL_PRINT,
    ],
    SALES: [
      Permission.ORDER_READ, Permission.ORDER_UPDATE, Permission.ORDER_CANCEL, Permission.ORDER_REFUND,
      Permission.ORDER_SHIP, Permission.CART_MANAGE, Permission.CHECKOUT_MANAGE,
      Permission.WHOLESALE_MANAGE, Permission.CUSTOMER_READ, Permission.CUSTOMER_UPDATE,
      Permission.ADDRESS_MANAGE, Permission.COMMUNICATION_SEND,
    ],
    SUPPORT: [
      Permission.ORDER_READ, Permission.CUSTOMER_READ, Permission.CUSTOMER_UPDATE,
      Permission.COMMUNICATION_SEND, Permission.REPORT_READ,
    ],
    ACCOUNTING: [
      Permission.INVOICE_CREATE, Permission.INVOICE_READ, Permission.RECEIPT_CREATE,
      Permission.ACCOUNTING_READ, Permission.ACCOUNTING_WRITE, Permission.CASH_MOVEMENT,
      Permission.EXPENSE_MANAGE, Permission.TAX_CONFIGURE, Permission.REPORT_READ,
      Permission.REPORT_EXPORT, Permission.AUDIT_READ,
    ],
  };

  for (const [roleName, permissions] of Object.entries(rolePermissions)) {
    await prisma.roleModel.upsert({
      where: { name: roleName as Role },
      update: { permissions, description: `Rol ${roleName}` },
      create: { name: roleName as Role, permissions, description: `Rol ${roleName}`, isSystem: true },
    });
  }

  // ============================================
  // 2. USUARIO SUPERADMIN
  // ============================================
  console.log('👤 Creando superadmin...');

  // El seed nunca debe crear una cuenta privilegiada con credenciales públicas.
  // Para crear el primer administrador se requiere una contraseña explícita y segura.
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(adminEmail)) {
      throw new Error('SEED_ADMIN_EMAIL no es un correo válido');
    }
    if (adminPassword.length < 16) {
      throw new Error('SEED_ADMIN_PASSWORD debe tener al menos 16 caracteres');
    }
    const passwordHash = await hash(adminPassword, 12);
    const superAdmin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        name: 'Administrador Principal',
        passwordHash,
        status: UserStatus.ACTIVE,
        emailVerified: null,
        phoneVerified: null,
        locale: 'es-PE',
        timezone: 'America/Lima',
        currency: 'PEN',
      },
    });
    const adminRole = await prisma.roleModel.findUniqueOrThrow({ where: { name: Role.SUPERADMIN } });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: superAdmin.id, roleId: adminRole.id } },
      update: {},
      create: { userId: superAdmin.id, roleId: adminRole.id },
    });
  } else if (adminEmail || adminPassword) {
    throw new Error('Configura SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD juntos');
  } else {
    console.log('Sin credenciales de administrador: se omite la creación del superadmin.');
  }

  // ============================================
  // 3. CONFIGURACIÓN DE TIENDA
  // ============================================
  console.log('⚙️ Creando configuración de tienda...');

  const settings = [
    // General
    { key: 'store_name', value: 'Pizca del Monte', type: 'string', group: 'general', label: 'Nombre de la tienda', isPublic: true },
    { key: 'store_description', value: 'Especias, sales, aceites y productos gourmet peruanos de la más alta calidad', type: 'string', group: 'general', label: 'Descripción', isPublic: true },
    { key: 'store_email', value: '', type: 'string', group: 'general', label: 'Email de contacto', isPublic: true },
    { key: 'store_phone', value: '', type: 'string', group: 'general', label: 'Teléfono', isPublic: true },
    { key: 'store_address', value: '', type: 'string', group: 'general', label: 'Dirección física', isPublic: true },
    { key: 'store_ruc', value: '', type: 'string', group: 'general', label: 'RUC', isPublic: true },
    { key: 'default_currency', value: 'PEN', type: 'string', group: 'general', label: 'Moneda por defecto', isPublic: true },
    { key: 'default_locale', value: 'es-PE', type: 'string', group: 'general', label: 'Idioma por defecto', isPublic: true },
    { key: 'timezone', value: 'America/Lima', type: 'string', group: 'general', label: 'Zona horaria', isPublic: true },

    // Branding
    { key: 'logo_light', value: '', type: 'image', group: 'branding', label: 'Logo modo claro', isPublic: true },
    { key: 'logo_dark', value: '', type: 'image', group: 'branding', label: 'Logo modo oscuro', isPublic: true },
    { key: 'favicon', value: '', type: 'image', group: 'branding', label: 'Favicon', isPublic: true },
    { key: 'primary_color', value: '#1B4D3E', type: 'color', group: 'branding', label: 'Color principal (verde bosque)', isPublic: true },
    { key: 'secondary_color', value: '#E8A87C', type: 'color', group: 'branding', label: 'Color secundario (terracota)', isPublic: true },
    { key: 'accent_color', value: '#D4A574', type: 'color', group: 'branding', label: 'Color acento (ocre)', isPublic: true },
    { key: 'background_color', value: '#FDFBF7', type: 'color', group: 'branding', label: 'Color fondo (marfil)', isPublic: true },
    { key: 'text_color', value: '#1A1A1A', type: 'color', group: 'branding', label: 'Color texto (tinta)', isPublic: true },

    // Checkout
    { key: 'guest_checkout', value: true, type: 'boolean', group: 'checkout', label: 'Permitir compra como invitado', isPublic: true },
    { key: 'require_phone', value: true, type: 'boolean', group: 'checkout', label: 'Requerir teléfono', isPublic: true },
    { key: 'min_order_amount', value: 0, type: 'number', group: 'checkout', label: 'Monto mínimo de pedido', isPublic: true },
    { key: 'free_shipping_threshold', value: 0, type: 'number', group: 'checkout', label: 'Envío gratis desde (PEN)', isPublic: true },

    // Shipping
    { key: 'default_shipping_carrier', value: '', type: 'string', group: 'shipping', label: 'Transportista por defecto', isPublic: false },
    { key: 'shipping_origin_ubigeo', value: '', type: 'string', group: 'shipping', label: 'UBIGEO origen (Lima)', isPublic: false },
    { key: 'enable_pickup', value: false, type: 'boolean', group: 'shipping', label: 'Habilitar recojo en tienda', isPublic: true },

    // Payment
    { key: 'mercadopago_public_key', value: '', type: 'string', group: 'payment', label: 'Mercado Pago Public Key', isPublic: false },
    { key: 'mercadopago_access_token', value: '', type: 'string', group: 'payment', label: 'Mercado Pago Access Token', isPublic: false },
    { key: 'mercadopago_webhook_secret', value: '', type: 'string', group: 'payment', label: 'Mercado Pago Webhook Secret', isPublic: false },
    { key: 'enable_yape', value: false, type: 'boolean', group: 'payment', label: 'Habilitar Yape', isPublic: true },
    { key: 'enable_plin', value: false, type: 'boolean', group: 'payment', label: 'Habilitar Plin', isPublic: true },
    { key: 'enable_bank_transfer', value: false, type: 'boolean', group: 'payment', label: 'Habilitar transferencia bancaria', isPublic: true },
    { key: 'bank_account_info', value: '', type: 'html', group: 'payment', label: 'Datos de cuenta bancaria', isPublic: false },

    // Tax
    { key: 'default_tax_rate', value: 18, type: 'number', group: 'tax', label: 'IGV por defecto (%)', isPublic: false },
    { key: 'tax_included_in_prices', value: true, type: 'boolean', group: 'tax', label: 'Precios incluyen IGV', isPublic: true },

    // Email
    { key: 'smtp_host', value: '', type: 'string', group: 'email', label: 'SMTP Host', isPublic: false },
    { key: 'smtp_port', value: 587, type: 'number', group: 'email', label: 'SMTP Port', isPublic: false },
    { key: 'smtp_user', value: '', type: 'string', group: 'email', label: 'SMTP User', isPublic: false },
    { key: 'smtp_pass', value: '', type: 'string', group: 'email', label: 'SMTP Password', isPublic: false },
    { key: 'email_from', value: '', type: 'string', group: 'email', label: 'Remitente emails', isPublic: false },

    // SEO
    { key: 'site_url', value: '', type: 'string', group: 'seo', label: 'URL del sitio', isPublic: true },
    { key: 'og_image', value: '', type: 'image', group: 'seo', label: 'Imagen Open Graph por defecto', isPublic: true },
    { key: 'google_analytics_id', value: '', type: 'string', group: 'seo', label: 'Google Analytics ID', isPublic: false },
    { key: 'facebook_pixel_id', value: '', type: 'string', group: 'seo', label: 'Facebook Pixel ID', isPublic: false },

    // Legal
    { key: 'terms_url', value: '/terminos-y-condiciones', type: 'string', group: 'legal', label: 'URL Términos y Condiciones', isPublic: true },
    { key: 'privacy_url', value: '/politica-de-privacidad', type: 'string', group: 'legal', label: 'URL Política de Privacidad', isPublic: true },
    { key: 'cookies_url', value: '/politica-de-cookies', type: 'string', group: 'legal', label: 'URL Política de Cookies', isPublic: true },
    { key: 'complaint_book_url', value: '/libro-de-reclamaciones', type: 'string', group: 'legal', label: 'URL Libro de Reclamaciones', isPublic: true },
  ];

  for (const setting of settings) {
    await prisma.storeSetting.upsert({
      where: { key: setting.key },
      // No sobrescribir valores que ya fueron configurados por el administrador.
      update: {},
      create: setting,
    });
  }

  // ============================================
  // 4. IMPUESTOS (SUNAT)
  // ============================================
  console.log('💰 Creando configuración de impuestos...');

  await prisma.taxConfiguration.upsert({
    where: { id: 'igv-default' },
    update: {},
    create: {
      id: 'igv-default',
      name: 'IGV General 18%',
      type: TaxType.IGV,
      rate: new Decimal('0.1800'),
      isActive: true,
      appliesTo: ['all'],
      exemptions: [],
      startDate: new Date('2024-01-01'),
      sunatCode: '1000',
    },
  });

  await prisma.taxConfiguration.upsert({
    where: { id: 'isc-licor' },
    update: {},
    create: {
      id: 'isc-licor',
      name: 'ISC Licores',
      type: TaxType.ISC,
      rate: new Decimal('0.1000'),
      isActive: true,
      appliesTo: ['bebidas-alcoholicas'],
      exemptions: [],
      startDate: new Date('2024-01-01'),
      sunatCode: '2000',
    },
  });

  // ============================================
  // 5. CATEGORÍAS
  // ============================================
  console.log('📂 Creando categorías...');

  const categories = [
    { name: 'Especias', slug: 'especias', description: 'Especias puras y mezclas artesanales', icon: '🌿', sortOrder: 1, children: [
      { name: 'Ajíes y Picantes', slug: 'ajies-picantes', description: 'Ají amarillo, panca, rocoto, charapita y más' },
      { name: 'Hierbas Aromáticas', slug: 'hierbas-aromaticas', description: 'Orégano, tomillo, romero, laurel, huacatay' },
      { name: 'Semillas y Granos', slug: 'semillas-granos', description: 'Comino, anís, cilantro, mostaza, sésamo' },
      { name: 'Mezclas Especiales', slug: 'mezclas-especiales', description: 'Adobos, rubs, curry peruano, tajín' },
    ]},
    { name: 'Sales Gourmet', slug: 'sales-gourmet', description: 'Sales marinas, de montaña y aromatizadas', icon: '🧂', sortOrder: 2, children: [
      { name: 'Sales Marinas', slug: 'sales-marinas', description: 'Sal de Maras, flor de sal, sal gruesa' },
      { name: 'Sales Aromatizadas', slug: 'sales-aromatizadas', description: 'Sal de hierbas, sal ahumada, sal de ají' },
      { name: 'Sales de Origen', slug: 'sales-origen', description: 'Sal rosa del Himalaya, sal negra, sal azul' },
    ]},
    { name: 'Aceites y Vinagres', slug: 'aceites-vinagres', description: 'Aceites de oliva, aceites infusionados y vinagres artesanales', icon: '🫒', sortOrder: 3, children: [
      { name: 'Aceite de Oliva Virgen Extra', slug: 'aceite-oliva-virgen-extra', description: 'Varietales: Arbequina, Picual, Coratina' },
      { name: 'Aceites Infusionados', slug: 'aceites-infusionados', description: 'Aceite de ají, ajo, romero, trufa, albahaca' },
      { name: 'Vinagres Artesanales', slug: 'vinagres-artesanales', description: 'Vinagre de manzana, Jerez, balsámico, frutos rojos' },
    ]},
    { name: 'Mezclas y Salsas', slug: 'mezclas-salsas', description: 'Salsas, aderezos y preparados listos para usar', icon: '🥣', sortOrder: 4, children: [
      { name: 'Salsas Picantes', slug: 'salsas-picantes', description: 'Salsa de rocoto, huancaína, ocopa, criolla' },
      { name: 'Aderezos y Vinagretas', slug: 'aderezos-vinagretas', description: 'Para ensaladas, marinados y dips' },
      { name: 'Pastas y Patés', slug: 'pastas-pates', description: 'Pasta de ají, olive tapenade, paté de aceitunas' },
    ]},
    { name: 'Packs Gourmet', slug: 'packs-gourmet', description: 'Cajas de regalo y combos curados', icon: '🎁', sortOrder: 5, children: [
      { name: 'Packs de Inicio', slug: 'packs-inicio', description: 'Kits básicos para nueva cocina' },
      { name: 'Packs Temáticos', slug: 'packs-tematicos', description: 'Parrilla, ceviche, criolla, vegano' },
      { name: 'Regalos Corporativos', slug: 'regalos-corporativos', description: 'Cajas personalizadas para empresas' },
    ]},
    { name: 'Accesorios', slug: 'accesorios', description: 'Morteros, molinillos, frascos y utensilios', icon: '🛠️', sortOrder: 6, children: [
      { name: 'Morteros y Molinillos', slug: 'morteros-molinillos', description: 'De piedra, madera, cerámica y acero' },
      { name: 'Frascos y Almacenamiento', slug: 'frascos-almacenamiento', description: 'Herméticos, vidrio oscurecido, etiquetados' },
      { name: 'Utensilios de Medida', slug: 'utensilios-medida', description: 'Cucharas medidoras, balanzas, termómetros' },
    ]},
  ];

  for (const cat of categories) {
    const { children, ...parentData } = cat;
    const parent = await prisma.category.upsert({
      where: { slug: parentData.slug },
      update: {},
      create: { ...parentData, level: 0, isActive: true, showInMenu: true },
    });

    for (let i = 0; i < children.length; i++) {
      await prisma.category.upsert({
        where: { slug: children[i].slug },
        update: {},
        create: { ...children[i], parentId: parent.id, level: 1, isActive: true, showInMenu: true, sortOrder: i + 1 },
      });
    }
  }

  // ============================================
  // 6. MARCAS
  // ============================================
  console.log('🏷️ Creando marcas...');

  const brands = [
    { name: 'Pizca del Monte', slug: 'pizca-del-monte', description: 'Nuestra marca propia: productos seleccionados y envasados en Perú', isActive: true, sortOrder: 1 },
    { name: 'Maras', slug: 'maras', description: 'Sal de los Andes peruanos, tradición milenaria', isActive: true, sortOrder: 2 },
    { name: 'Oliva del Sur', slug: 'oliva-del-sur', description: 'Aceite de oliva premium de Ica y Arequipa', isActive: true, sortOrder: 3 },
    { name: 'Ají Negro', slug: 'aji-negro', description: 'Especialistas en ajíes amazónicos y andinos', isActive: true, sortOrder: 4 },
    { name: 'Inka Spice', slug: 'inka-spice', description: 'Mezclas inspiradas en la cocina ancestral', isActive: true, sortOrder: 5 },
  ];

  for (const brand of brands) {
    await prisma.brand.upsert({ where: { slug: brand.slug }, update: {}, create: brand });
  }

  // ============================================
  // 7. ATRIBUTOS Y VALORES
  // ============================================
  console.log('🎨 Creando atributos...');

  const attributes = [
    { name: 'Peso / Presentación', slug: 'peso-presentacion', type: 'select', isVariant: true, isFilterable: true, sortOrder: 1, values: ['10g', '25g', '50g', '100g', '250g', '500g', '1kg', '50ml', '100ml', '250ml', '500ml', '1L'] },
    { name: 'Nivel de Picor', slug: 'nivel-picor', type: 'select', isVariant: false, isFilterable: true, sortOrder: 2, values: ['Sin picor', 'Suave', 'Medio', 'Fuerte', 'Muy fuerte', 'Extremo'] },
    { name: 'Origen', slug: 'origen', type: 'select', isVariant: false, isFilterable: true, sortOrder: 3, values: ['Costa', 'Sierra', 'Selva', 'Amazónico', 'Andino', 'Costeño', 'Importado'] },
    { name: 'Uso Recomendado', slug: 'uso-recomendado', type: 'select', isVariant: false, isFilterable: true, sortOrder: 4, values: ['Carnes', 'Pescados', 'Mariscos', 'Vegetales', 'Sopas', 'Adobos', 'Marinados', 'Postres', 'Bebidas', 'Todo uso'] },
    { name: 'Certificación', slug: 'certificacion', type: 'select', isVariant: false, isFilterable: true, sortOrder: 5, values: ['Orgánico', 'Libre de gluten', 'Vegano', 'Kosher', 'Halal', 'Sin aditivos', 'Comercio justo'] },
    { name: 'Sabor', slug: 'sabor', type: 'select', isVariant: false, isFilterable: true, sortOrder: 6, values: ['Ahumaado', 'Cítrico', 'Dulce', 'Terroso', 'Fresco', 'Floral', 'Frutal', 'Herbal', 'Picante', 'Salado', 'Umami'] },
  ];

  for (const attr of attributes) {
    const { values, ...attrData } = attr;
    const created = await prisma.attribute.upsert({ where: { slug: attrData.slug }, update: {}, create: attrData });
    for (let i = 0; i < values.length; i++) {
      await prisma.attributeValue.upsert({
        where: { attributeId_slug: { attributeId: created.id, slug: values[i].toLowerCase().replace(/\s+/g, '-') } },
        update: {},
        create: { attributeId: created.id, value: values[i], slug: values[i].toLowerCase().replace(/\s+/g, '-'), sortOrder: i },
      });
    }
  }

  // ============================================
  // 8. ALMACENES
  // ============================================
  console.log('🏭 Creando almacenes...');

  const mainWarehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-LIM-01' },
    update: {},
    create: {
      name: 'Almacén Principal Lima',
      code: 'WH-LIM-01',
      address: 'Av. Industrial 456, Ate, Lima',
      city: 'Lima',
      region: 'Lima',
      country: 'PE',
      isActive: true,
      isDefault: true,
      contactName: 'Carlos Mendoza',
      contactPhone: '+51987654321',
      contactEmail: 'almacen@pizcadelmonte.pe',
    },
  });

  await prisma.warehouse.upsert({
    where: { code: 'WH-LIM-02' },
    update: {},
    create: {
      name: 'Almacén Secundario / Showroom',
      code: 'WH-LIM-02',
      address: 'Jr. de la Unión 789, Cercado de Lima',
      city: 'Lima',
      region: 'Lima',
      country: 'PE',
      isActive: true,
      isDefault: false,
      contactName: 'María González',
      contactPhone: '+51987654322',
      contactEmail: 'showroom@pizcadelmonte.pe',
    },
  });

  // ============================================
  // 9. TRANSPORTISTAS
  // ============================================
  console.log('🚚 Creando transportistas...');

  const shalom = await prisma.carrier.upsert({
    where: { slug: 'shalom' },
    update: {},
    create: {
      name: 'Shalom',
      slug: 'shalom',
      code: 'SHALOM',
      type: 'courier',
      apiEndpoint: 'https://api.shalom.com.pe/v1',
      trackingUrl: 'https://shalom.com.pe/rastrea',
      supportsPickup: true,
      supportsDropoff: true,
      maxWeight: new Decimal('30'),
      maxDimensions: { length: 100, width: 60, height: 40 },
      isActive: true,
      config: { requiresContract: true, testMode: true },
      priority: 1,
    },
  });

  await prisma.carrier.upsert({
    where: { slug: 'olva-courier' },
    update: {},
    create: {
      name: 'Olva Courier',
      slug: 'olva-courier',
      code: 'OLVA',
      type: 'courier',
      trackingUrl: 'https://olvacourier.com/rastreo',
      supportsPickup: true,
      supportsDropoff: true,
      maxWeight: new Decimal('50'),
      isActive: true,
      priority: 2,
    },
  });

  await prisma.carrier.upsert({
    where: { slug: 'serpost' },
    update: {},
    create: {
      name: 'Serpost (Correos del Perú)',
      slug: 'serpost',
      code: 'SERPOST',
      type: 'postal',
      trackingUrl: 'https://www.serpost.com.pe/rastreo',
      supportsPickup: false,
      supportsDropoff: true,
      maxWeight: new Decimal('20'),
      isActive: true,
      priority: 3,
    },
  });

  await prisma.carrier.upsert({
    where: { slug: 'pickup-store' },
    update: {},
    create: {
      name: 'Recojo en Tienda / Showroom',
      slug: 'pickup-store',
      code: 'PICKUP',
      type: 'pickup',
      supportsPickup: false,
      supportsDropoff: false,
      isActive: true,
      priority: 0,
    },
  });

  // Zonas de envío para Shalom (Lima y provincias principales)
  const limaZone = await prisma.shippingZone.upsert({
    where: { id: 'zone-lima' },
    update: {},
    create: {
      id: 'zone-lima',
      name: 'Lima Metropolitana',
      carrierId: shalom.id,
      countries: ['PE'],
      regions: ['Lima'],
      provinces: ['Lima', 'Callao'],
      isActive: true,
    },
  });

  const provinciasZone = await prisma.shippingZone.upsert({
    where: { id: 'zone-provincias' },
    update: {},
    create: {
      id: 'zone-provincias',
      name: 'Principales Provincias',
      carrierId: shalom.id,
      countries: ['PE'],
      regions: ['Arequipa', 'Cusco', 'La Libertad', 'Lambayeque', 'Piura', 'Junín', 'Ancash', 'Ica'],
      isActive: true,
    },
  });

  const nacionalZone = await prisma.shippingZone.upsert({
    where: { id: 'zone-nacional' },
    update: {},
    create: {
      id: 'zone-nacional',
      name: 'Resto del Perú',
      carrierId: shalom.id,
      countries: ['PE'],
      isActive: true,
    },
  });

  // Tarifas de envío
  await prisma.shippingRate.upsert({
    where: { id: 'rate-lima-standard' },
    update: {},
    create: { id: 'rate-lima-standard', zoneId: limaZone.id, name: 'Lima Estándar (24-48h)', basePrice: new Decimal('12.00'), pricePerKg: new Decimal('1.50'), estimatedDays: 2, isActive: true, sortOrder: 1 },
  });
  await prisma.shippingRate.upsert({
    where: { id: 'rate-lima-express' },
    update: {},
    create: { id: 'rate-lima-express', zoneId: limaZone.id, name: 'Lima Express (mismo día)', basePrice: new Decimal('25.00'), pricePerKg: new Decimal('2.00'), estimatedDays: 1, isActive: true, sortOrder: 2 },
  });
  await prisma.shippingRate.upsert({
    where: { id: 'rate-provincias-standard' },
    update: {},
    create: { id: 'rate-provincias-standard', zoneId: provinciasZone.id, name: 'Provincias Estándar (3-5 días)', basePrice: new Decimal('18.00'), pricePerKg: new Decimal('2.50'), estimatedDays: 5, isActive: true, sortOrder: 1 },
  });
  await prisma.shippingRate.upsert({
    where: { id: 'rate-nacional-standard' },
    update: {},
    create: { id: 'rate-nacional-standard', zoneId: nacionalZone.id, name: 'Nacional Estándar (5-7 días)', basePrice: new Decimal('22.00'), pricePerKg: new Decimal('3.00'), estimatedDays: 7, isActive: true, sortOrder: 1 },
  });
  await prisma.shippingRate.upsert({
    where: { id: 'rate-pickup' },
    update: {},
    create: { id: 'rate-pickup', zoneId: limaZone.id, name: 'Recojo en Showroom (Gratis)', basePrice: new Decimal('0.00'), estimatedDays: 0, isActive: true, sortOrder: 0 },
  });

  // ============================================
  // 10. PRODUCTOS DE EJEMPLO
  // ============================================
  console.log('🛍️ Creando productos de ejemplo...');

  const pizcaBrand = await prisma.brand.findUnique({ where: { slug: 'pizca-del-monte' } })!;
  const marasBrand = await prisma.brand.findUnique({ where: { slug: 'maras' } })!;
  const olivaBrand = await prisma.brand.findUnique({ where: { slug: 'oliva-del-sur' } })!;
  const ajiBrand = await prisma.brand.findUnique({ where: { slug: 'aji-negro' } })!;
  const inkaBrand = await prisma.brand.findUnique({ where: { slug: 'inka-spice' } })!;

  const catAjies = await prisma.category.findUnique({ where: { slug: 'ajies-picantes' } })!;
  const catHierbas = await prisma.category.findUnique({ where: { slug: 'hierbas-aromaticas' } })!;
  const catSales = await prisma.category.findUnique({ where: { slug: 'sales-marinas' } })!;
  const catSalesAroma = await prisma.category.findUnique({ where: { slug: 'sales-aromatizadas' } })!;
  const catAceites = await prisma.category.findUnique({ where: { slug: 'aceite-oliva-virgen-extra' } })!;
  const catAceitesInf = await prisma.category.findUnique({ where: { slug: 'aceites-infusionados' } })!;
  const catVinagres = await prisma.category.findUnique({ where: { slug: 'vinagres-artesanales' } })!;
  const catSalsas = await prisma.category.findUnique({ where: { slug: 'salsas-picantes' } })!;
  const catPacks = await prisma.category.findUnique({ where: { slug: 'packs-tematicos' } })!;

  const attrPeso = await prisma.attribute.findUnique({ where: { slug: 'peso-presentacion' } })!;
  const attrPicor = await prisma.attribute.findUnique({ where: { slug: 'nivel-picor' } })!;
  const attrOrigen = await prisma.attribute.findUnique({ where: { slug: 'origen' } })!;
  const attrUso = await prisma.attribute.findUnique({ where: { slug: 'uso-recomendado' } })!;
  const attrCert = await prisma.attribute.findUnique({ where: { slug: 'certificacion' } })!;

  const val50g = await prisma.attributeValue.findFirst({ where: { attributeId: attrPeso.id, value: '50g' } })!;
  const val100g = await prisma.attributeValue.findFirst({ where: { attributeId: attrPeso.id, value: '100g' } })!;
  const val250g = await prisma.attributeValue.findFirst({ where: { attributeId: attrPeso.id, value: '250g' } })!;
  const val250ml = await prisma.attributeValue.findFirst({ where: { attributeId: attrPeso.id, value: '250ml' } })!;
  const val500ml = await prisma.attributeValue.findFirst({ where: { attributeId: attrPeso.id, value: '500ml' } })!;
  const valSuave = await prisma.attributeValue.findFirst({ where: { attributeId: attrPicor.id, value: 'Suave' } })!;
  const valMedio = await prisma.attributeValue.findFirst({ where: { attributeId: attrPicor.id, value: 'Medio' } })!;
  const valFuerte = await prisma.attributeValue.findFirst({ where: { attributeId: attrPicor.id, value: 'Fuerte' } })!;
  const valSierra = await prisma.attributeValue.findFirst({ where: { attributeId: attrOrigen.id, value: 'Sierra' } })!;
  const valCosta = await prisma.attributeValue.findFirst({ where: { attributeId: attrOrigen.id, value: 'Costa' } })!;
  const valSelva = await prisma.attributeValue.findFirst({ where: { attributeId: attrOrigen.id, value: 'Selva' } })!;
  const valCarnes = await prisma.attributeValue.findFirst({ where: { attributeId: attrUso.id, value: 'Carnes' } })!;
  const valPescados = await prisma.attributeValue.findFirst({ where: { attributeId: attrUso.id, value: 'Pescados' } })!;
  const valTodo = await prisma.attributeValue.findFirst({ where: { attributeId: attrUso.id, value: 'Todo uso' } })!;
  const valOrganico = await prisma.attributeValue.findFirst({ where: { attributeId: attrCert.id, value: 'Orgánico' } })!;
  const valSinGluten = await prisma.attributeValue.findFirst({ where: { attributeId: attrCert.id, value: 'Libre de gluten' } })!;
  const valVegano = await prisma.attributeValue.findFirst({ where: { attributeId: attrCert.id, value: 'Vegano' } })!;

  // Helper for Cloudinary placeholder images
  const cloudinaryBase = 'https://res.cloudinary.com/pizcadelmonte/image/upload';
  const productImage = (name: string) => `${cloudinaryBase}/v1700000000/products/${name}.jpg`;

  // Additional attribute values needed for new products
  const val20g = await prisma.attributeValue.findFirst({ where: { attributeId: attrPeso.id, value: '20g' } })!;
  const val25g = await prisma.attributeValue.findFirst({ where: { attributeId: attrPeso.id, value: '25g' } })!;
  const val30g = await prisma.attributeValue.findFirst({ where: { attributeId: attrPeso.id, value: '30g' } })!;
  const val60g = await prisma.attributeValue.findFirst({ where: { attributeId: attrPeso.id, value: '60g' } })!;
  const val200g = await prisma.attributeValue.findFirst({ where: { attributeId: attrPeso.id, value: '200g' } })!;
  const val200ml = await prisma.attributeValue.findFirst({ where: { attributeId: attrPeso.id, value: '200ml' } })!;
  const valExtremo = await prisma.attributeValue.findFirst({ where: { attributeId: attrPicor.id, value: 'Extremo' } })!;
  const valImportado = await prisma.attributeValue.findFirst({ where: { attributeId: attrOrigen.id, value: 'Importado' } })!;

  const products = [
    {
      sku: 'PDM-AJI-AMA-050G',
      name: 'Ají Amarillo Molido',
      slug: 'aji-amarillo-molido',
      description: 'Ají amarillo 100% peruano, secado al sol y molido artesanalmente. El alma de la cocina criolla: causa, papa a la huancaína, ají de gallina y más.',
      shortDescription: 'Ají amarillo puro, molido fino, ideal para cocina criolla',
      type: ProductType.SIMPLE,
      status: ProductStatus.ACTIVE,
      brandId: pizcaBrand.id,
      basePrice: new Decimal('18.00'),
      compareAtPrice: new Decimal('22.00'),
      costPrice: new Decimal('8.50'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('0.050'),
      unitOfMeasure: 'G',
      trackInventory: true,
      allowBackorder: false,
      requiresShipping: true,
      publishedAt: new Date(),
      metaTitle: 'Ají Amarillo Molido 50g | Pizca del Monte',
      metaDescription: 'Ají amarillo peruano molido artesanalmente. Perfecto para causa, huancaína y ají de gallina. Envío a todo el Perú.',
      categories: [catAjies.id],
      attributes: [
        { attributeId: attrPeso.id, attributeValueId: val50g.id },
        { attributeId: attrPicor.id, attributeValueId: valMedio.id },
        { attributeId: attrOrigen.id, attributeValueId: valCosta.id },
        { attributeId: attrUso.id, attributeValueId: valTodo.id },
        { attributeId: attrCert.id, attributeValueId: valSinGluten.id },
        { attributeId: attrCert.id, attributeValueId: valVegano.id },
      ],
      variants: [
        { sku: 'PDM-AJI-AMA-050G', name: '50g', price: new Decimal('18.00'), weight: new Decimal('0.050'), isDefault: true, attributes: [{ attributeId: attrPeso.id, attributeValueId: val50g.id }] },
        { sku: 'PDM-AJI-AMA-100G', name: '100g', price: new Decimal('32.00'), weight: new Decimal('0.100'), attributes: [{ attributeId: attrPeso.id, attributeValueId: val100g.id }] },
        { sku: 'PDM-AJI-AMA-250G', name: '250g (Ahorro)', price: new Decimal('70.00'), weight: new Decimal('0.250'), attributes: [{ attributeId: attrPeso.id, attributeValueId: val250g.id }] },
      ],
      images: [
        { url: productImage('aji-amarillo-molido-1'), alt: 'Ají Amarillo Molido 50g - Vista frontal', isPrimary: true, sortOrder: 0 },
        { url: productImage('aji-amarillo-molido-2'), alt: 'Ají Amarillo Molido - Detalle de textura', isPrimary: false, sortOrder: 1 },
      ],
    },
    {
      sku: 'PDM-AJI-PAN-050G',
      name: 'Ají Panca Molido',
      slug: 'aji-panca-molido',
      description: 'Ají panca de la costa norte, sabor dulce y ahumado, color rojo intenso. Base del adobo, anticuchos, seco de cordero y carapulcra.',
      shortDescription: 'Ají panca dulce y ahumado, color rojo intenso',
      type: ProductType.SIMPLE,
      status: ProductStatus.ACTIVE,
      brandId: pizcaBrand.id,
      basePrice: new Decimal('18.00'),
      compareAtPrice: new Decimal('22.00'),
      costPrice: new Decimal('8.50'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('0.050'),
      unitOfMeasure: 'G',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catAjies.id],
      attributes: [
        { attributeId: attrPeso.id, attributeValueId: val50g.id },
        { attributeId: attrPicor.id, attributeValueId: valSuave.id },
        { attributeId: attrOrigen.id, attributeValueId: valCosta.id },
        { attributeId: attrUso.id, attributeValueId: valCarnes.id },
        { attributeId: attrCert.id, attributeValueId: valSinGluten.id },
        { attributeId: attrCert.id, attributeValueId: valVegano.id },
      ],
      variants: [
        { sku: 'PDM-AJI-PAN-050G', name: '50g', price: new Decimal('18.00'), weight: new Decimal('0.050'), isDefault: true, attributes: [{ attributeId: attrPeso.id, attributeValueId: val50g.id }] },
        { sku: 'PDM-AJI-PAN-100G', name: '100g', price: new Decimal('32.00'), weight: new Decimal('0.100'), attributes: [{ attributeId: attrPeso.id, attributeValueId: val100g.id }] },
      ],
      images: [
        { url: productImage('aji-panca-molido-1'), alt: 'Ají Panca Molido 50g - Vista frontal', isPrimary: true, sortOrder: 0 },
        { url: productImage('aji-panca-molido-2'), alt: 'Ají Panca Molido - Color rojo intenso', isPrimary: false, sortOrder: 1 },
      ],
    },
    {
      sku: 'PDM-AJI-ROC-030G',
      name: 'Ají Rocoto Molido',
      slug: 'aji-rocoto-molido',
      description: 'Rocoto de la sierra sur, picor intenso y frutal. Para los valientes: rocoto relleno, ceviche de rocoto, salsas extremas.',
      shortDescription: 'Rocoto molido, picor extremo y sabor frutal',
      type: ProductType.SIMPLE,
      status: ProductStatus.ACTIVE,
      brandId: ajiBrand.id,
      basePrice: new Decimal('25.00'),
      compareAtPrice: new Decimal('30.00'),
      costPrice: new Decimal('12.00'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('0.030'),
      unitOfMeasure: 'G',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catAjies.id],
      attributes: [
        { attributeId: attrPeso.id, attributeValueId: val30g.id },
        { attributeId: attrPicor.id, attributeValueId: valExtremo.id },
        { attributeId: attrOrigen.id, attributeValueId: valSierra.id },
        { attributeId: attrUso.id, attributeValueId: valCarnes.id },
        { attributeId: attrCert.id, attributeValueId: valSinGluten.id },
      ],
      variants: [
        { sku: 'PDM-AJI-ROC-030G', name: '30g', price: new Decimal('25.00'), weight: new Decimal('0.030'), isDefault: true },
        { sku: 'PDM-AJI-ROC-060G', name: '60g', price: new Decimal('45.00'), weight: new Decimal('0.060') },
      ],
      images: [
        { url: productImage('aji-rocoto-molido-1'), alt: 'Ají Rocoto Molido 30g - Vista frontal', isPrimary: true, sortOrder: 0 },
      ],
    },
    {
      sku: 'PDM-SAL-MAR-250G',
      name: 'Sal de Maras - Flor de Sal',
      slug: 'sal-de-maras-flor-de-sal',
      description: 'Flor de sal cosechada a mano en las milenarias salineras de Maras, Cusco. Cristales delicados, sabor suave y mineral. Para terminar platos gourmet.',
      shortDescription: 'Flor de sal artesanal de Maras, Cusco',
      type: ProductType.SIMPLE,
      status: ProductStatus.ACTIVE,
      brandId: marasBrand.id,
      basePrice: new Decimal('45.00'),
      compareAtPrice: new Decimal('55.00'),
      costPrice: new Decimal('22.00'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('0.250'),
      unitOfMeasure: 'G',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catSales.id],
      attributes: [
        { attributeId: attrPeso.id, attributeValueId: val250g.id },
        { attributeId: attrOrigen.id, attributeValueId: valSierra.id },
        { attributeId: attrUso.id, attributeValueId: valTodo.id },
        { attributeId: attrCert.id, attributeValueId: valOrganico.id },
        { attributeId: attrCert.id, attributeValueId: valSinGluten.id },
        { attributeId: attrCert.id, attributeValueId: valVegano.id },
      ],
      variants: [
        { sku: 'PDM-SAL-MAR-250G', name: '250g', price: new Decimal('45.00'), weight: new Decimal('0.250'), isDefault: true, attributes: [{ attributeId: attrPeso.id, attributeValueId: val250g.id }] },
        { sku: 'PDM-SAL-MAR-100G', name: '100g', price: new Decimal('22.00'), weight: new Decimal('0.100'), attributes: [{ attributeId: attrPeso.id, attributeValueId: val100g.id }] },
      ],
      images: [
        { url: productImage('sal-maras-flor-1'), alt: 'Sal de Maras Flor de Sal 250g - Frasco de vidrio', isPrimary: true, sortOrder: 0 },
        { url: productImage('sal-maras-flor-2'), alt: 'Sal de Maras - Cristales delicados', isPrimary: false, sortOrder: 1 },
        { url: productImage('sal-maras-flor-3'), alt: 'Salineras de Maras, Cusco', isPrimary: false, sortOrder: 2 },
      ],
    },
    {
      sku: 'PDM-SAL-AJI-100G',
      name: 'Sal de Ají Amarillo',
      slug: 'sal-de-aji-amarillo',
      description: 'Sal marina infusionada con ají amarillo fresco. Toque picante y color vibrante para carnes, pescados, ceviches y snacks.',
      shortDescription: 'Sal marina con ají amarillo, picante y colorido',
      type: ProductType.SIMPLE,
      status: ProductStatus.ACTIVE,
      brandId: pizcaBrand.id,
      basePrice: new Decimal('28.00'),
      compareAtPrice: new Decimal('34.00'),
      costPrice: new Decimal('13.00'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('0.100'),
      unitOfMeasure: 'G',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catSalesAroma.id],
      attributes: [
        { attributeId: attrPeso.id, attributeValueId: val100g.id },
        { attributeId: attrPicor.id, attributeValueId: valMedio.id },
        { attributeId: attrOrigen.id, attributeValueId: valCosta.id },
        { attributeId: attrUso.id, attributeValueId: valTodo.id },
        { attributeId: attrCert.id, attributeValueId: valSinGluten.id },
        { attributeId: attrCert.id, attributeValueId: valVegano.id },
      ],
      variants: [
        { sku: 'PDM-SAL-AJI-100G', name: '100g', price: new Decimal('28.00'), weight: new Decimal('0.100'), isDefault: true },
        { sku: 'PDM-SAL-AJI-250G', name: '250g', price: new Decimal('60.00'), weight: new Decimal('0.250') },
      ],
      images: [
        { url: productImage('sal-aji-amarillo-1'), alt: 'Sal de Ají Amarillo 100g - Frasco', isPrimary: true, sortOrder: 0 },
        { url: productImage('sal-aji-amarillo-2'), alt: 'Sal de Ají Amarillo - Color vibrante', isPrimary: false, sortOrder: 1 },
      ],
    },
    {
      sku: 'PDM-ACE-ARB-500ML',
      name: 'Aceite de Oliva Virgen Extra - Arbequina',
      slug: 'aceite-oliva-arbequina',
      description: 'Aceite de oliva variedad Arbequina, cosecha temprana en Ica. Notas a manzana verde, almendra y hierba fresca. Acidez < 0.3%.',
      shortDescription: 'AOVE Arbequina, cosecha temprana, acidez < 0.3%',
      type: ProductType.SIMPLE,
      status: ProductStatus.ACTIVE,
      brandId: olivaBrand.id,
      basePrice: new Decimal('89.00'),
      compareAtPrice: new Decimal('110.00'),
      costPrice: new Decimal('42.00'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('0.470'),
      length: new Decimal('7.5'),
      width: new Decimal('7.5'),
      height: new Decimal('28.0'),
      unitOfMeasure: 'ML',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catAceites.id],
      attributes: [
        { attributeId: attrPeso.id, attributeValueId: val500ml.id },
        { attributeId: attrOrigen.id, attributeValueId: valCosta.id },
        { attributeId: attrUso.id, attributeValueId: valTodo.id },
        { attributeId: attrCert.id, attributeValueId: valOrganico.id },
        { attributeId: attrCert.id, attributeValueId: valSinGluten.id },
        { attributeId: attrCert.id, attributeValueId: valVegano.id },
      ],
      variants: [
        { sku: 'PDM-ACE-ARB-250ML', name: '250ml', price: new Decimal('49.00'), weight: new Decimal('0.235'), attributes: [{ attributeId: attrPeso.id, attributeValueId: val250ml.id }] },
        { sku: 'PDM-ACE-ARB-500ML', name: '500ml', price: new Decimal('89.00'), weight: new Decimal('0.470'), isDefault: true, attributes: [{ attributeId: attrPeso.id, attributeValueId: val500ml.id }] },
      ],
      images: [
        { url: productImage('aceite-arbequina-1'), alt: 'Aceite de Oliva Arbequina 500ml - Botella oscura', isPrimary: true, sortOrder: 0 },
        { url: productImage('aceite-arbequina-2'), alt: 'Aceite Arbequina - Detalle de etiqueta', isPrimary: false, sortOrder: 1 },
      ],
    },
    {
      sku: 'PDM-ACE-AJI-250ML',
      name: 'Aceite Infusionado de Ají Charapita',
      slug: 'aceite-infusionado-aji-charapita',
      description: 'Aceite de oliva base infusionado con ají charapita amazónico. Aroma tropical, picor brillante y persistente. Para pizza, pasta, ceviche y carpaccios.',
      shortDescription: 'Aceite de oliva con ají charapita, aroma amazónico',
      type: ProductType.SIMPLE,
      status: ProductStatus.ACTIVE,
      brandId: ajiBrand.id,
      basePrice: new Decimal('65.00'),
      compareAtPrice: new Decimal('78.00'),
      costPrice: new Decimal('30.00'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('0.235'),
      unitOfMeasure: 'ML',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catAceitesInf.id],
      attributes: [
        { attributeId: attrPeso.id, attributeValueId: val250ml.id },
        { attributeId: attrPicor.id, attributeValueId: valFuerte.id },
        { attributeId: attrOrigen.id, attributeValueId: valSelva.id },
        { attributeId: attrUso.id, attributeValueId: valTodo.id },
        { attributeId: attrCert.id, attributeValueId: valSinGluten.id },
        { attributeId: attrCert.id, attributeValueId: valVegano.id },
      ],
      variants: [
        { sku: 'PDM-ACE-AJI-250ML', name: '250ml', price: new Decimal('65.00'), weight: new Decimal('0.235'), isDefault: true },
      ],
      images: [
        { url: productImage('aceite-charapita-1'), alt: 'Aceite Infusionado Ají Charapita 250ml', isPrimary: true, sortOrder: 0 },
        { url: productImage('aceite-charapita-2'), alt: 'Aceite Charapita - Ajíes en botella', isPrimary: false, sortOrder: 1 },
      ],
    },
    {
      sku: 'PDM-VIN-MAN-250ML',
      name: 'Vinagre de Manzana Orgánico con Madre',
      slug: 'vinagre-manzana-organico',
      description: 'Vinagre de manzana crudo, sin filtrar, con "madre" viva. Fermentado artesanalmente en Cusco. Para aderezos, marinados, shots de salud y conservación.',
      shortDescription: 'Vinagre de manzana crudo con madre, orgánico',
      type: ProductType.SIMPLE,
      status: ProductStatus.ACTIVE,
      brandId: inkaBrand.id,
      basePrice: new Decimal('38.00'),
      compareAtPrice: new Decimal('45.00'),
      costPrice: new Decimal('18.00'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('0.250'),
      unitOfMeasure: 'ML',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catVinagres.id],
      attributes: [
        { attributeId: attrPeso.id, attributeValueId: val250ml.id },
        { attributeId: attrOrigen.id, attributeValueId: valSierra.id },
        { attributeId: attrUso.id, attributeValueId: valTodo.id },
        { attributeId: attrCert.id, attributeValueId: valOrganico.id },
        { attributeId: attrCert.id, attributeValueId: valSinGluten.id },
        { attributeId: attrCert.id, attributeValueId: valVegano.id },
      ],
      variants: [
        { sku: 'PDM-VIN-MAN-250ML', name: '250ml', price: new Decimal('38.00'), weight: new Decimal('0.250'), isDefault: true },
        { sku: 'PDM-VIN-MAN-500ML', name: '500ml', price: new Decimal('68.00'), weight: new Decimal('0.500') },
      ],
      images: [
        { url: productImage('vinagre-manzana-1'), alt: 'Vinagre de Manzana Orgánico 250ml con madre', isPrimary: true, sortOrder: 0 },
        { url: productImage('vinagre-manzana-2'), alt: 'Vinagre de Manzana - Madre visible', isPrimary: false, sortOrder: 1 },
      ],
    },
    {
      sku: 'PDM-SAL-HUA-200ML',
      name: 'Salsa Huancaína Clásica',
      slug: 'salsa-huancaina-clasica',
      description: 'Nuestra receta tradicional: ají amarillo, queso fresco, leche evaporada, galleta, aceite y especias. Lista para servir sobre papas, yuca, causa o como dip.',
      shortDescription: 'Salsa huancaína artesanal, lista para servir',
      type: ProductType.SIMPLE,
      status: ProductStatus.ACTIVE,
      brandId: pizcaBrand.id,
      basePrice: new Decimal('32.00'),
      compareAtPrice: new Decimal('38.00'),
      costPrice: new Decimal('15.00'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('0.200'),
      unitOfMeasure: 'ML',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catSalsas.id],
      attributes: [
        { attributeId: attrPeso.id, attributeValueId: val200ml.id },
        { attributeId: attrPicor.id, attributeValueId: valMedio.id },
        { attributeId: attrOrigen.id, attributeValueId: valCosta.id },
        { attributeId: attrUso.id, attributeValueId: valTodo.id },
      ],
      variants: [
        { sku: 'PDM-SAL-HUA-200ML', name: '200ml', price: new Decimal('32.00'), weight: new Decimal('0.200'), isDefault: true },
        { sku: 'PDM-SAL-HUA-500ML', name: '500ml (Familiar)', price: new Decimal('68.00'), weight: new Decimal('0.500') },
      ],
      images: [
        { url: productImage('salsa-huancaina-1'), alt: 'Salsa Huancaína Clásica 200ml - Frasco', isPrimary: true, sortOrder: 0 },
        { url: productImage('salsa-huancaina-2'), alt: 'Salsa Huancaína - Textura cremosa', isPrimary: false, sortOrder: 1 },
      ],
    },
    {
      sku: 'PDM-PACK-PAR-001',
      name: 'Pack Parrilla Peruana',
      slug: 'pack-parrilla-peruana',
      description: 'Todo para una parrilla inolvidable: Sal de Maras 100g, Ají Panca 50g, Ají Amarillo 50g, Aceite de Oliva 250ml, Chimichurri artesanal 100g, Mortero de piedra pequeño. En caja de madera grabada.',
      shortDescription: 'Kit completo para parrilla: sales, ajíes, aceite y chimichurri',
      type: ProductType.BUNDLE,
      status: ProductStatus.ACTIVE,
      brandId: pizcaBrand.id,
      basePrice: new Decimal('289.00'),
      compareAtPrice: new Decimal('349.00'),
      costPrice: new Decimal('145.00'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('1.500'),
      unitOfMeasure: 'UN',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catPacks.id],
      attributes: [
        { attributeId: attrOrigen.id, attributeValueId: valCosta.id },
        { attributeId: attrUso.id, attributeValueId: valCarnes.id },
        { attributeId: attrCert.id, attributeValueId: valSinGluten.id },
      ],
      variants: [
        { sku: 'PDM-PACK-PAR-001', name: 'Pack Estándar', price: new Decimal('289.00'), weight: new Decimal('1.500'), isDefault: true },
      ],
      bundleComponents: [
        { componentSku: 'PDM-SAL-MAR-100G', quantity: 1 },
        { componentSku: 'PDM-AJI-PAN-050G', quantity: 1 },
        { componentSku: 'PDM-AJI-AMA-050G', quantity: 1 },
        { componentSku: 'PDM-ACE-ARB-250ML', quantity: 1 },
      ],
      images: [
        { url: productImage('pack-parrilla-1'), alt: 'Pack Parrilla Peruana - Caja de madera completa', isPrimary: true, sortOrder: 0 },
        { url: productImage('pack-parrilla-2'), alt: 'Pack Parrilla - Contenido detallado', isPrimary: false, sortOrder: 1 },
        { url: productImage('pack-parrilla-3'), alt: 'Pack Parrilla - Caja grabada', isPrimary: false, sortOrder: 2 },
      ],
    },
    // ===== NUEVOS PRODUCTOS (11 más para total 20) =====
    {
      sku: 'PDM-AJI-CHA-020G',
      name: 'Ají Charapita Fresco Deshidratado',
      slug: 'aji-charapita-deshidratado',
      description: 'Ají charapita de la Amazonía peruana, deshidratado a baja temperatura para preservar su aroma floral y picor brillante. El "caviar de ajíes" para ceviches, tiraditos y platos de autor.',
      shortDescription: 'Ají charapita amazónico, aroma floral y picor brillante',
      type: ProductType.SIMPLE,
      status: ProductStatus.ACTIVE,
      brandId: ajiBrand.id,
      basePrice: new Decimal('42.00'),
      compareAtPrice: new Decimal('50.00'),
      costPrice: new Decimal('20.00'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('0.020'),
      unitOfMeasure: 'G',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catAjies.id],
      attributes: [
        { attributeId: attrPeso.id, attributeValueId: val20g.id },
        { attributeId: attrPicor.id, attributeValueId: valFuerte.id },
        { attributeId: attrOrigen.id, attributeValueId: valSelva.id },
        { attributeId: attrUso.id, attributeValueId: valPescados.id },
        { attributeId: attrCert.id, attributeValueId: valOrganico.id },
        { attributeId: attrCert.id, attributeValueId: valSinGluten.id },
        { attributeId: attrCert.id, attributeValueId: valVegano.id },
      ],
      variants: [
        { sku: 'PDM-AJI-CHA-020G', name: '20g', price: new Decimal('42.00'), weight: new Decimal('0.020'), isDefault: true },
        { sku: 'PDM-AJI-CHA-050G', name: '50g', price: new Decimal('95.00'), weight: new Decimal('0.050') },
      ],
      images: [
        { url: productImage('aji-charapita-1'), alt: 'Ají Charapita Deshidratado 20g - Frasco pequeño', isPrimary: true, sortOrder: 0 },
        { url: productImage('aji-charapita-2'), alt: 'Ají Charapita - Granos amarillo dorado', isPrimary: false, sortOrder: 1 },
      ],
    },
    {
      sku: 'PDM-HIE-HUA-030G',
      name: 'Huacatay Andino Seco',
      slug: 'huacatay-andino-seco',
      description: 'Huacatay (menta negra andina) cosechado en los valles de Cusco. Aroma intenso a menta, albahaca y cítricos. Esencial para ocopa, pachamanca y adobos.',
      shortDescription: 'Huacatay cusqueño, aroma a menta y cítricos',
      type: ProductType.SIMPLE,
      status: ProductStatus.ACTIVE,
      brandId: inkaBrand.id,
      basePrice: new Decimal('15.00'),
      compareAtPrice: new Decimal('18.00'),
      costPrice: new Decimal('7.00'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('0.030'),
      unitOfMeasure: 'G',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catHierbas.id],
      attributes: [
        { attributeId: attrPeso.id, attributeValueId: val30g.id },
        { attributeId: attrPicor.id, attributeValueId: valSuave.id },
        { attributeId: attrOrigen.id, attributeValueId: valSierra.id },
        { attributeId: attrUso.id, attributeValueId: valTodo.id },
        { attributeId: attrCert.id, attributeValueId: valOrganico.id },
        { attributeId: attrCert.id, attributeValueId: valSinGluten.id },
        { attributeId: attrCert.id, attributeValueId: valVegano.id },
      ],
      variants: [
        { sku: 'PDM-HIE-HUA-030G', name: '30g', price: new Decimal('15.00'), weight: new Decimal('0.030'), isDefault: true },
        { sku: 'PDM-HIE-HUA-100G', name: '100g', price: new Decimal('42.00'), weight: new Decimal('0.100') },
      ],
      images: [
        { url: productImage('huacatay-1'), alt: 'Huacatay Andino 30g - Hojas secas', isPrimary: true, sortOrder: 0 },
        { url: productImage('huacatay-2'), alt: 'Huacatay - Detalle de hoja', isPrimary: false, sortOrder: 1 },
      ],
    },
    {
      sku: 'PDM-HIE-ORO-025G',
      name: 'Orégano de la Sierra',
      slug: 'oregano-sierra',
      description: 'Orégano silvestre recolectado en las alturas de Ayacucho. Sabor más intenso y complejo que el orégano mediterráneo. Ideal para carnes, guisos y pizzas artesanales.',
      shortDescription: 'Orégano silvestre ayacuchano, sabor intenso',
      type: ProductType.SIMPLE,
      status: ProductStatus.ACTIVE,
      brandId: pizcaBrand.id,
      basePrice: new Decimal('14.00'),
      compareAtPrice: new Decimal('17.00'),
      costPrice: new Decimal('6.50'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('0.025'),
      unitOfMeasure: 'G',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catHierbas.id],
      attributes: [
        { attributeId: attrPeso.id, attributeValueId: val25g.id },
        { attributeId: attrPicor.id, attributeValueId: valSuave.id },
        { attributeId: attrOrigen.id, attributeValueId: valSierra.id },
        { attributeId: attrUso.id, attributeValueId: valCarnes.id },
        { attributeId: attrCert.id, attributeValueId: valOrganico.id },
        { attributeId: attrCert.id, attributeValueId: valSinGluten.id },
        { attributeId: attrCert.id, attributeValueId: valVegano.id },
      ],
      variants: [
        { sku: 'PDM-HIE-ORO-025G', name: '25g', price: new Decimal('14.00'), weight: new Decimal('0.025'), isDefault: true },
        { sku: 'PDM-HIE-ORO-050G', name: '50g', price: new Decimal('25.00'), weight: new Decimal('0.050') },
      ],
      images: [
        { url: productImage('oregano-sierra-1'), alt: 'Orégano de la Sierra 25g', isPrimary: true, sortOrder: 0 },
      ],
    },
    {
      sku: 'PDM-SEM-COM-050G',
      name: 'Comino Andino Entero',
      slug: 'comino-andino-entero',
      description: 'Semillas de comino cultivado en los valles interandinos. Aroma terroso, cálido y ligeramente dulce. Para adobos, chili, humitas y tamales.',
      shortDescription: 'Comino andino en grano, aroma terroso y cálido',
      type: ProductType.SIMPLE,
      status: ProductStatus.ACTIVE,
      brandId: pizcaBrand.id,
      basePrice: new Decimal('16.00'),
      compareAtPrice: new Decimal('20.00'),
      costPrice: new Decimal('7.50'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('0.050'),
      unitOfMeasure: 'G',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catHierbas.id],
      attributes: [
        { attributeId: attrPeso.id, attributeValueId: val50g.id },
        { attributeId: attrPicor.id, attributeValueId: valSuave.id },
        { attributeId: attrOrigen.id, attributeValueId: valSierra.id },
        { attributeId: attrUso.id, attributeValueId: valCarnes.id },
        { attributeId: attrCert.id, attributeValueId: valOrganico.id },
        { attributeId: attrCert.id, attributeValueId: valSinGluten.id },
        { attributeId: attrCert.id, attributeValueId: valVegano.id },
      ],
      variants: [
        { sku: 'PDM-SEM-COM-050G', name: '50g', price: new Decimal('16.00'), weight: new Decimal('0.050'), isDefault: true },
        { sku: 'PDM-SEM-COM-100G', name: '100g', price: new Decimal('28.00'), weight: new Decimal('0.100') },
      ],
      images: [
        { url: productImage('comino-andino-1'), alt: 'Comino Andino 50g - Semillas enteras', isPrimary: true, sortOrder: 0 },
      ],
    },
    {
      sku: 'PDM-SAL-ROS-200G',
      name: 'Sal Rosa del Himalaya Fina',
      slug: 'sal-rosa-himalaya-fina',
      description: 'Sal rosa del Himalaya molida fina, rica en 84 minerales traza. Color rosa pálido natural, sabor suave y menos sodio por gramo. Para uso diario en cocina gourmet.',
      shortDescription: 'Sal rosa del Himalaya fina, 84 minerales',
      type: ProductType.SIMPLE,
      status: ProductStatus.ACTIVE,
      brandId: marasBrand.id,
      basePrice: new Decimal('35.00'),
      compareAtPrice: new Decimal('42.00'),
      costPrice: new Decimal('16.00'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('0.200'),
      unitOfMeasure: 'G',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catSalesAroma.id],
      attributes: [
        { attributeId: attrPeso.id, attributeValueId: val200g.id },
        { attributeId: attrOrigen.id, attributeValueId: valImportado.id },
        { attributeId: attrUso.id, attributeValueId: valTodo.id },
        { attributeId: attrCert.id, attributeValueId: valSinGluten.id },
        { attributeId: attrCert.id, attributeValueId: valVegano.id },
      ],
      variants: [
        { sku: 'PDM-SAL-ROS-200G', name: '200g', price: new Decimal('35.00'), weight: new Decimal('0.200'), isDefault: true },
        { sku: 'PDM-SAL-ROS-500G', name: '500g', price: new Decimal('78.00'), weight: new Decimal('0.500') },
      ],
      images: [
        { url: productImage('sal-rosa-himalaya-1'), alt: 'Sal Rosa Himalaya 200g - Color rosa natural', isPrimary: true, sortOrder: 0 },
        { url: productImage('sal-rosa-himalaya-2'), alt: 'Sal Rosa - Cristales finos', isPrimary: false, sortOrder: 1 },
      ],
    },
    {
      sku: 'PDM-SAL-AHU-100G',
      name: 'Sal Ahumada de Maras',
      slug: 'sal-ahumada-maras',
      description: 'Flor de sal de Maras ahumada con leña de algarrobo por 48 horas. Aroma ahumado profundo, color dorado. Para carnes a la parrilla, vegetales asados y cócteles.',
      shortDescription: 'Sal de Maras ahumada con algarrobo, aroma profundo',
      type: ProductType.SIMPLE,
      status: ProductStatus.ACTIVE,
      brandId: marasBrand.id,
      basePrice: new Decimal('38.00'),
      compareAtPrice: new Decimal('45.00'),
      costPrice: new Decimal('18.00'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('0.100'),
      unitOfMeasure: 'G',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catSalesAroma.id],
      attributes: [
        { attributeId: attrPeso.id, attributeValueId: val100g.id },
        { attributeId: attrPicor.id, attributeValueId: valSuave.id },
        { attributeId: attrOrigen.id, attributeValueId: valSierra.id },
        { attributeId: attrUso.id, attributeValueId: valCarnes.id },
        { attributeId: attrCert.id, attributeValueId: valOrganico.id },
        { attributeId: attrCert.id, attributeValueId: valSinGluten.id },
        { attributeId: attrCert.id, attributeValueId: valVegano.id },
      ],
      variants: [
        { sku: 'PDM-SAL-AHU-100G', name: '100g', price: new Decimal('38.00'), weight: new Decimal('0.100'), isDefault: true },
      ],
      images: [
        { url: productImage('sal-ahumada-1'), alt: 'Sal Ahumada Maras 100g - Color dorado', isPrimary: true, sortOrder: 0 },
        { url: productImage('sal-ahumada-2'), alt: 'Sal Ahumada - Ahumado con algarrobo', isPrimary: false, sortOrder: 1 },
      ],
    },
    {
      sku: 'PDM-ACE-PIC-250ML',
      name: 'Aceite de Oliva Picual',
      slug: 'aceite-oliva-picual',
      description: 'Aceite de oliva variedad Picual, la más cultivada en España, producida en Ica. Sabor robusto, picante y amargo equilibrado. Alta estabilidad, ideal para freír y guisos.',
      shortDescription: 'AOVE Picual, robusto y estable para cocinar',
      type: ProductType.SIMPLE,
      status: ProductStatus.ACTIVE,
      brandId: olivaBrand.id,
      basePrice: new Decimal('78.00'),
      compareAtPrice: new Decimal('95.00'),
      costPrice: new Decimal('36.00'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('0.235'),
      length: new Decimal('7.5'),
      width: new Decimal('7.5'),
      height: new Decimal('28.0'),
      unitOfMeasure: 'ML',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catAceites.id],
      attributes: [
        { attributeId: attrPeso.id, attributeValueId: val250ml.id },
        { attributeId: attrOrigen.id, attributeValueId: valCosta.id },
        { attributeId: attrUso.id, attributeValueId: valTodo.id },
        { attributeId: attrCert.id, attributeValueId: valOrganico.id },
        { attributeId: attrCert.id, attributeValueId: valSinGluten.id },
        { attributeId: attrCert.id, attributeValueId: valVegano.id },
      ],
      variants: [
        { sku: 'PDM-ACE-PIC-250ML', name: '250ml', price: new Decimal('45.00'), weight: new Decimal('0.235'), attributes: [{ attributeId: attrPeso.id, attributeValueId: val250ml.id }] },
        { sku: 'PDM-ACE-PIC-500ML', name: '500ml', price: new Decimal('78.00'), weight: new Decimal('0.470'), isDefault: true, attributes: [{ attributeId: attrPeso.id, attributeValueId: val500ml.id }] },
      ],
      images: [
        { url: productImage('aceite-picual-1'), alt: 'Aceite de Oliva Picual 500ml', isPrimary: true, sortOrder: 0 },
      ],
    },
    {
      sku: 'PDM-ACE-ALB-250ML',
      name: 'Aceite Infusionado de Albahaca',
      slug: 'aceite-infusionado-albahaca',
      description: 'Aceite de oliva Arbequina infusionado con albahaca fresca de Oxapampa. Aroma herbáceo dulce, notas a anís y menta. Para pastas, pizzas, ensaladas caprese y bruschettas.',
      shortDescription: 'Aceite de oliva con albahaca fresca de Oxapampa',
      type: ProductType.SIMPLE,
      status: ProductStatus.ACTIVE,
      brandId: olivaBrand.id,
      basePrice: new Decimal('58.00'),
      compareAtPrice: new Decimal('68.00'),
      costPrice: new Decimal('27.00'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('0.235'),
      unitOfMeasure: 'ML',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catAceitesInf.id],
      attributes: [
        { attributeId: attrPeso.id, attributeValueId: val250ml.id },
        { attributeId: attrPicor.id, attributeValueId: valSuave.id },
        { attributeId: attrOrigen.id, attributeValueId: valCosta.id },
        { attributeId: attrUso.id, attributeValueId: valTodo.id },
        { attributeId: attrCert.id, attributeValueId: valSinGluten.id },
        { attributeId: attrCert.id, attributeValueId: valVegano.id },
      ],
      variants: [
        { sku: 'PDM-ACE-ALB-250ML', name: '250ml', price: new Decimal('58.00'), weight: new Decimal('0.235'), isDefault: true },
      ],
      images: [
        { url: productImage('aceite-albahaca-1'), alt: 'Aceite Infusionado Albahaca 250ml', isPrimary: true, sortOrder: 0 },
        { url: productImage('aceite-albahaca-2'), alt: 'Aceite Albahaca - Hojas en botella', isPrimary: false, sortOrder: 1 },
      ],
    },
    {
      sku: 'PDM-VIN-JER-250ML',
      name: 'Vinagre de Jerez Reserva 25 Años',
      slug: 'vinagre-jerez-reserva',
      description: 'Vinagre de Jerez envejecido 25 años en botas de roble por sistema solera. Complejo, dulce, con notas a pasas, madera y caramelo. Para reducciones, foie, postres y quesos curados.',
      shortDescription: 'Vinagre de Jerez 25 años solera, complejo y dulce',
      type: ProductType.SIMPLE,
      status: ProductStatus.ACTIVE,
      brandId: inkaBrand.id,
      basePrice: new Decimal('125.00'),
      compareAtPrice: new Decimal('150.00'),
      costPrice: new Decimal('58.00'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('0.250'),
      unitOfMeasure: 'ML',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catVinagres.id],
      attributes: [
        { attributeId: attrPeso.id, attributeValueId: val250ml.id },
        { attributeId: attrOrigen.id, attributeValueId: valImportado.id },
        { attributeId: attrUso.id, attributeValueId: valTodo.id },
        { attributeId: attrCert.id, attributeValueId: valSinGluten.id },
        { attributeId: attrCert.id, attributeValueId: valVegano.id },
      ],
      variants: [
        { sku: 'PDM-VIN-JER-250ML', name: '250ml', price: new Decimal('125.00'), weight: new Decimal('0.250'), isDefault: true },
      ],
      images: [
        { url: productImage('vinagre-jerez-1'), alt: 'Vinagre de Jerez Reserva 250ml - Botella oscura', isPrimary: true, sortOrder: 0 },
      ],
    },
    {
      sku: 'PDM-SAL-OCP-200ML',
      name: 'Salsa Ocopa Arequipeña',
      slug: 'salsa-ocopa-arenquipena',
      description: 'Salsa tradicional arequipeña: huacatay, ají amarillo, ají panca, maní, queso, galleta y leche. Picante medio, cremosa y aromática. Para papas, yuca, cau-cau y como dip.',
      shortDescription: 'Salsa ocopa arequipeña con huacatay y maní',
      type: ProductType.SIMPLE,
      status: ProductStatus.ACTIVE,
      brandId: pizcaBrand.id,
      basePrice: new Decimal('34.00'),
      compareAtPrice: new Decimal('40.00'),
      costPrice: new Decimal('16.00'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('0.200'),
      unitOfMeasure: 'ML',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catSalsas.id],
      attributes: [
        { attributeId: attrPeso.id, attributeValueId: val200ml.id },
        { attributeId: attrPicor.id, attributeValueId: valMedio.id },
        { attributeId: attrOrigen.id, attributeValueId: valSierra.id },
        { attributeId: attrUso.id, attributeValueId: valTodo.id },
      ],
      variants: [
        { sku: 'PDM-SAL-OCP-200ML', name: '200ml', price: new Decimal('34.00'), weight: new Decimal('0.200'), isDefault: true },
        { sku: 'PDM-SAL-OCP-500ML', name: '500ml (Familiar)', price: new Decimal('72.00'), weight: new Decimal('0.500') },
      ],
      images: [
        { url: productImage('salsa-ocopa-1'), alt: 'Salsa Ocopa Arequipeña 200ml - Color verde vibrante', isPrimary: true, sortOrder: 0 },
        { url: productImage('salsa-ocopa-2'), alt: 'Salsa Ocopa - Textura con maní', isPrimary: false, sortOrder: 1 },
      ],
    },
    {
      sku: 'PDM-PACK-CEV-001',
      name: 'Pack Ceviche & Tiradito',
      slug: 'pack-ceviche-tiradito',
      description: 'Kit para ceviche y tiradito perfecto: Sal de Maras 100g, Ají Limo fresco deshidratado 15g, Ají Amarillo 50g, Limón de Pica deshidratado 30g, Cancha serrana 100g, Choclo desgranado 100g. Incluye receta paso a paso.',
      shortDescription: 'Kit completo para ceviche y tiradito',
      type: ProductType.BUNDLE,
      status: ProductStatus.ACTIVE,
      brandId: pizcaBrand.id,
      basePrice: new Decimal('189.00'),
      compareAtPrice: new Decimal('229.00'),
      costPrice: new Decimal('95.00'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('0.800'),
      unitOfMeasure: 'UN',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catPacks.id],
      attributes: [
        { attributeId: attrOrigen.id, attributeValueId: valCosta.id },
        { attributeId: attrUso.id, attributeValueId: valPescados.id },
        { attributeId: attrCert.id, attributeValueId: valSinGluten.id },
      ],
      variants: [
        { sku: 'PDM-PACK-CEV-001', name: 'Pack Estándar', price: new Decimal('189.00'), weight: new Decimal('0.800'), isDefault: true },
      ],
      bundleComponents: [
        { componentSku: 'PDM-SAL-MAR-100G', quantity: 1 },
        { componentSku: 'PDM-AJI-AMA-050G', quantity: 1 },
      ],
      images: [
        { url: productImage('pack-ceviche-1'), alt: 'Pack Ceviche & Tiradito - Caja completa', isPrimary: true, sortOrder: 0 },
        { url: productImage('pack-ceviche-2'), alt: 'Pack Ceviche - Ingredientes detallados', isPrimary: false, sortOrder: 1 },
      ],
    },
    {
      sku: 'PDM-PACK-REG-001',
      name: 'Pack Regalo Gourmet - Esenciales',
      slug: 'pack-regalo-gourmet-esenciales',
      description: 'Caja de regalo premium: Sal de Maras Flor 100g, Ají Amarillo 50g, Ají Panca 50g, Aceite Arbequina 250ml, Vinagre Manzana 250ml, Huacatay 30g. En caja rígida con separadores y tarjeta de recetas.',
      shortDescription: 'Caja regalo: 6 esenciales peruanos premium',
      type: ProductType.BUNDLE,
      status: ProductStatus.ACTIVE,
      brandId: pizcaBrand.id,
      basePrice: new Decimal('349.00'),
      compareAtPrice: new Decimal('419.00'),
      costPrice: new Decimal('175.00'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('1.800'),
      unitOfMeasure: 'UN',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catPacks.id],
      attributes: [
        { attributeId: attrOrigen.id, attributeValueId: valCosta.id },
        { attributeId: attrUso.id, attributeValueId: valTodo.id },
        { attributeId: attrCert.id, attributeValueId: valSinGluten.id },
      ],
      variants: [
        { sku: 'PDM-PACK-REG-001', name: 'Pack Premium', price: new Decimal('349.00'), weight: new Decimal('1.800'), isDefault: true },
      ],
      bundleComponents: [
        { componentSku: 'PDM-SAL-MAR-100G', quantity: 1 },
        { componentSku: 'PDM-AJI-AMA-050G', quantity: 1 },
        { componentSku: 'PDM-AJI-PAN-050G', quantity: 1 },
        { componentSku: 'PDM-ACE-ARB-250ML', quantity: 1 },
        { componentSku: 'PDM-VIN-MAN-250ML', quantity: 1 },
        { componentSku: 'PDM-HIE-HUA-030G', quantity: 1 },
      ],
      images: [
        { url: productImage('pack-regalo-esenciales-1'), alt: 'Pack Regalo Gourmet Esenciales - Caja premium', isPrimary: true, sortOrder: 0 },
        { url: productImage('pack-regalo-esenciales-2'), alt: 'Pack Regalo - Interior con separadores', isPrimary: false, sortOrder: 1 },
        { url: productImage('pack-regalo-esenciales-3'), alt: 'Pack Regalo - Tarjeta de recetas incluida', isPrimary: false, sortOrder: 2 },
      ],
    },
    {
      sku: 'PDM-MIX-ADO-060G',
      name: 'Adobo Criollo para Carnes',
      slug: 'adobo-criollo-carnes',
      description: 'Mezcla lista para adobar: ají panca, ají amarillo, comino, ajo, orégano, sillao, vinagre y especias. Para pollo, cerdo, res y anticuchos. Solo añadir aceite y marinar 2 horas.',
      shortDescription: 'Adobo criollo listo para usar, para todo tipo de carnes',
      type: ProductType.SIMPLE,
      status: ProductStatus.ACTIVE,
      brandId: inkaBrand.id,
      basePrice: new Decimal('22.00'),
      compareAtPrice: new Decimal('26.00'),
      costPrice: new Decimal('10.00'),
      taxRate: new Decimal('18.00'),
      weight: new Decimal('0.060'),
      unitOfMeasure: 'G',
      trackInventory: true,
      publishedAt: new Date(),
      categories: [catAjies.id],
      attributes: [
        { attributeId: attrPeso.id, attributeValueId: val60g.id },
        { attributeId: attrPicor.id, attributeValueId: valMedio.id },
        { attributeId: attrOrigen.id, attributeValueId: valCosta.id },
        { attributeId: attrUso.id, attributeValueId: valCarnes.id },
        { attributeId: attrCert.id, attributeValueId: valSinGluten.id },
        { attributeId: attrCert.id, attributeValueId: valVegano.id },
      ],
      variants: [
        { sku: 'PDM-MIX-ADO-060G', name: '60g (4-5 porciones)', price: new Decimal('22.00'), weight: new Decimal('0.060'), isDefault: true },
        { sku: 'PDM-MIX-ADO-120G', name: '120g (8-10 porciones)', price: new Decimal('38.00'), weight: new Decimal('0.120') },
      ],
      images: [
        { url: productImage('adobo-criollo-1'), alt: 'Adobo Criollo 60g - Mezcla en frasco', isPrimary: true, sortOrder: 0 },
      ],
    },
  ];

  for (const prodData of products) {
    const { variants, categories, attributes, bundleComponents, images, ...productData } = prodData;

    // Crear producto base
    const product = await prisma.product.upsert({
      where: { sku: productData.sku },
      update: {},
      create: productData,
    });

    // Crear imágenes del producto (ProductMedia)
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const sortOrder = img.sortOrder ?? i;

        // Buscar si ya existe media para este producto y sortOrder
        const existingMedia = await prisma.productMedia.findFirst({
          where: { productId: product.id, sortOrder },
        });

        if (existingMedia) {
          await prisma.productMedia.update({
            where: { id: existingMedia.id },
            data: {
              url: img.url,
              alt: img.alt,
              type: 'IMAGE',
              isPrimary: img.isPrimary ?? (i === 0),
              sortOrder,
            },
          });
        } else {
          await prisma.productMedia.create({
            data: {
              productId: product.id,
              url: img.url,
              alt: img.alt,
              type: 'IMAGE',
              isPrimary: img.isPrimary ?? (i === 0),
              sortOrder,
            },
          });
        }
      }
    }

    // Relacionar categorías
    for (const catId of categories) {
      await prisma.productCategory.upsert({
        where: { productId_categoryId: { productId: product.id, categoryId: catId } },
        update: {},
        create: { productId: product.id, categoryId: catId, isPrimary: categories.indexOf(catId) === 0 },
      });
    }

    // Atributos del producto
    for (const attr of attributes) {
      await prisma.productAttributeValue.upsert({
        where: { productId_attributeId_attributeValueId: { productId: product.id, attributeId: attr.attributeId, attributeValueId: attr.attributeValueId } },
        update: {},
        create: { productId: product.id, ...attr },
      });
    }

    // Variantes
    for (let i = 0; i < variants.length; i++) {
      const varData = variants[i];
      const { attributes: varAttrs, ...variantData } = varData;

      const variant = await prisma.productVariant.upsert({
        where: { sku: variantData.sku },
        update: {},
        create: { ...variantData, productId: product.id },
      });

      // Atributos de la variante
      for (const vAttr of varAttrs) {
        await prisma.productAttributeValue.upsert({
          where: { variantId_attributeId_attributeValueId: { variantId: variant.id, attributeId: vAttr.attributeId, attributeValueId: vAttr.attributeValueId } },
          update: {},
          create: { variantId: variant.id, ...vAttr },
        });
      }

      // Inventario inicial para cada variante
      await prisma.inventoryItem.upsert({
        where: { variantId: variant.id },
        update: {},
        create: {
          variantId: variant.id,
          productId: product.id,
          quantity: 100,
          reservedQty: 0,
          availableQty: 100,
          minStock: 10,
          maxStock: 500,
          reorderPoint: 20,
          reorderQty: 100,
          warehouseId: mainWarehouse.id,
        },
      });

      // Lote inicial
      await prisma.inventoryLot.upsert({
        where: { productId_lotNumber: { productId: product.id, lotNumber: `LOT-${new Date().getFullYear()}-001` } },
        update: {},
        create: {
          productId: product.id,
          variantId: variant.id,
          lotNumber: `LOT-${new Date().getFullYear()}-001`,
          manufactureDate: new Date(),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
          quantity: 100,
          reservedQty: 0,
          availableQty: 100,
          costPrice: variant.costPrice,
          status: LotStatus.ACTIVE,
          warehouseId: mainWarehouse.id,
        },
      });
    }

    // Inventario para productos simples (sin variantes)
    if (variants.length === 0 || product.type === ProductType.SIMPLE) {
      await prisma.inventoryItem.upsert({
        where: { productId: product.id },
        update: {},
        create: {
          productId: product.id,
          quantity: 100,
          reservedQty: 0,
          availableQty: 100,
          minStock: 10,
          maxStock: 500,
          reorderPoint: 20,
          reorderQty: 100,
          warehouseId: mainWarehouse.id,
        },
      });
    }

    // Bundle components
    if (bundleComponents) {
      for (const comp of bundleComponents) {
        const component = await prisma.product.findUnique({ where: { sku: comp.componentSku } });
        if (component) {
          await prisma.bundleItem.upsert({
            where: { bundleId_componentId_componentVariantId: { bundleId: product.id, componentId: component.id, componentVariantId: null } },
            update: {},
            create: { bundleId: product.id, componentId: component.id, quantity: comp.quantity },
          });
        }
      }
    }
  }

  // ============================================
  // 11. COLECCIONES
  // ============================================
  console.log('📚 Creando colecciones...');

  const collections = [
    { name: 'Esenciales de la Cocina Peruana', slug: 'esenciales-cocina-peruana', description: 'Los indispensables que no pueden faltar en tu despensa', isFeatured: true, sortOrder: 1, products: ['PDM-AJI-AMA-050G', 'PDM-AJI-PAN-050G', 'PDM-SAL-MAR-250G', 'PDM-ACE-ARB-500ML'] },
    { name: 'Para la Parrilla', slug: 'para-la-parrilla', description: 'Sales, rubs, aceites y salsas para el maestro del asado', isFeatured: true, sortOrder: 2, products: ['PDM-PACK-PAR-001', 'PDM-SAL-AJI-100G', 'PDM-ACE-AJI-250ML'] },
    { name: 'Sabores de la Selva', slug: 'sabores-selva', description: 'Ajíes, sales y aceites de la Amazonía peruana', isFeatured: false, sortOrder: 3, products: ['PDM-AJI-ROC-030G', 'PDM-ACE-AJI-250ML'] },
    { name: 'Regalos Gourmet', slug: 'regalos-gourmet', description: 'Packs curados para sorprender a los amantes de la buena mesa', isFeatured: true, sortOrder: 4, products: ['PDM-PACK-PAR-001'] },
  ];

  for (const coll of collections) {
    const { products: productSkus, ...collData } = coll;
    const collection = await prisma.collection.upsert({ where: { slug: collData.slug }, update: {}, create: collData });

    for (let i = 0; i < productSkus.length; i++) {
      const prod = await prisma.product.findUnique({ where: { sku: productSkus[i] } });
      if (prod) {
        await prisma.collectionProduct.upsert({
          where: { collectionId_productId: { collectionId: collection.id, productId: prod.id } },
          update: {},
          create: { collectionId: collection.id, productId: prod.id, sortOrder: i, isFeatured: i === 0 },
        });
      }
    }
  }

  // ============================================
  // 12. PROMOCIONES Y CUPONES
  // ============================================
  console.log('🎁 Creando promociones y cupones...');

  const welcomePromo = await prisma.promotion.upsert({
    where: { slug: 'bienvenida-10' },
    update: {},
    create: {
      name: 'Bienvenida 10%',
      slug: 'bienvenida-10',
      description: '10% de descuento en tu primera compra',
      type: PromotionType.PERCENTAGE_OFF,
      value: new Decimal('10.00'),
      minOrderAmount: new Decimal('50.00'),
      maxDiscount: new Decimal('50.00'),
      usageLimit: 1000,
      perCustomerLimit: 1,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
      requiresCoupon: true,
      couponCode: 'BIENVENIDA10',
      appliesToAll: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'BIENVENIDA10' },
    update: {},
    create: {
      code: 'BIENVENIDA10',
      name: 'Cupón Bienvenida 10%',
      type: CouponType.PERCENTAGE,
      value: new Decimal('10.00'),
      minOrderAmount: new Decimal('50.00'),
      maxDiscount: new Decimal('50.00'),
      usageLimit: 1000,
      perCustomerLimit: 1,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
      promotionId: welcomePromo.id,
    },
  });

  const freeShippingPromo = await prisma.promotion.upsert({
    where: { slug: 'envio-gratis-150' },
    update: {},
    create: {
      name: 'Envío Gratis + S/150',
      slug: 'envio-gratis-150',
      description: 'Envío gratis en compras mayores a S/150',
      type: PromotionType.FREE_SHIPPING,
      value: new Decimal('0'),
      minOrderAmount: new Decimal('150.00'),
      startDate: new Date(),
      isActive: true,
      appliesToAll: true,
      requiresCoupon: false,
    },
  });

  // ============================================
  // 13. LISTAS DE PRECIOS (MAYORISTA)
  // ============================================
  console.log('💲 Creando listas de precios...');

  const wholesaleList = await prisma.priceList.upsert({
    where: { slug: 'mayorista-nivel-1' },
    update: {},
    create: {
      name: 'Mayorista Nivel 1',
      slug: 'mayorista-nivel-1',
      description: 'Precios para compras al por mayor (mínimo 10 unidades por SKU)',
      currency: 'PEN',
      isActive: true,
      priority: 10,
    },
  });

  // Agregar items de precio mayorista para algunos productos
  const productsForWholesale = await prisma.product.findMany({ where: { sku: { in: ['PDM-AJI-AMA-050G', 'PDM-AJI-PAN-050G', 'PDM-SAL-MAR-250G'] } } });
  for (const prod of productsForWholesale) {
    const basePrice = prod.basePrice;
    const wholesalePrice = basePrice.mul(0.7); // 30% descuento
    await prisma.priceListItem.upsert({
      where: { priceListId_productId_variantId_minQty: { priceListId: wholesaleList.id, productId: prod.id, variantId: null, minQty: 10 } },
      update: {},
      create: { priceListId: wholesaleList.id, productId: prod.id, price: wholesalePrice, minQty: 10 },
    });
  }

  // ============================================
  // 14. PLANTILLAS DE ETIQUETAS
  // ============================================
  console.log('🏷️ Creando plantillas de etiquetas...');

  await prisma.labelTemplate.upsert({
    where: { code: 'PRODUCT-50x30' },
    update: {},
    create: {
      name: 'Etiqueta Producto 50x30mm',
      code: 'PRODUCT-50x30',
      type: 'product',
      format: 'PDF',
      pageSize: 'custom',
      customWidth: new Decimal('50'),
      customHeight: new Decimal('30'),
      margins: { top: 2, right: 2, bottom: 2, left: 2 },
      columns: 4,
      rows: 8,
      gapX: new Decimal('2'),
      gapY: new Decimal('2'),
      template: {
        fields: [
          { type: 'logo', x: 5, y: 5, width: 20, height: 20 },
          { type: 'product_name', x: 5, y: 22, width: 40, height: 12, fontSize: 8, bold: true },
          { type: 'variant_name', x: 5, y: 30, width: 40, height: 8, fontSize: 6 },
          { type: 'net_weight', x: 5, y: 38, width: 20, height: 8, fontSize: 6 },
          { type: 'barcode', x: 25, y: 22, width: 20, height: 15 },
          { type: 'lot_number', x: 5, y: 46, width: 20, height: 6, fontSize: 5 },
          { type: 'expiry_date', x: 25, y: 38, width: 20, height: 8, fontSize: 6 },
        ],
      },
      isDefault: true,
      isActive: true,
    },
  });

  await prisma.labelTemplate.upsert({
    where: { code: 'LOT-60x40' },
    update: {},
    create: {
      name: 'Etiqueta Lote 60x40mm',
      code: 'LOT-60x40',
      type: 'lot',
      format: 'PDF',
      pageSize: 'custom',
      customWidth: new Decimal('60'),
      customHeight: new Decimal('40'),
      margins: { top: 3, right: 3, bottom: 3, left: 3 },
      columns: 3,
      rows: 6,
      gapX: new Decimal('3'),
      gapY: new Decimal('3'),
      template: {
        fields: [
          { type: 'logo', x: 5, y: 5, width: 25, height: 15 },
          { type: 'lot_number', x: 5, y: 22, width: 50, height: 10, fontSize: 10, bold: true },
          { type: 'product_name', x: 5, y: 32, width: 50, height: 8, fontSize: 7 },
          { type: 'manufacture_date', x: 5, y: 40, width: 25, height: 8, fontSize: 6 },
          { type: 'expiry_date', x: 30, y: 40, width: 25, height: 8, fontSize: 6 },
          { type: 'barcode', x: 5, y: 48, width: 50, height: 15 },
        ],
      },
      isActive: true,
    },
  });

  await prisma.labelTemplate.upsert({
    where: { code: 'SHIPPING-A4' },
    update: {},
    create: {
      name: 'Guía de Envío A4 (Shalom)',
      code: 'SHIPPING-A4',
      type: 'shipping',
      format: 'PDF',
      pageSize: 'A4',
      margins: { top: 10, right: 10, bottom: 10, left: 10 },
      columns: 1,
      rows: 1,
      template: {
        fields: [
          { type: 'carrier_logo', x: 20, y: 20, width: 60, height: 20 },
          { type: 'tracking_barcode', x: 20, y: 50, width: 170, height: 30 },
          { type: 'tracking_number', x: 20, y: 85, width: 170, height: 10, fontSize: 14 },
          { type: 'sender_info', x: 20, y: 105, width: 85, height: 60, fontSize: 8 },
          { type: 'recipient_info', x: 115, y: 105, width: 85, height: 60, fontSize: 8 },
          { type: 'package_info', x: 20, y: 175, width: 170, height: 30, fontSize: 10 },
          { type: 'qr_code', x: 150, y: 20, width: 40, height: 40 },
        ],
      },
      isActive: true,
    },
  });

  // ============================================
  // 15. RECETAS DE EJEMPLO
  // ============================================
  console.log('🍳 Creando recetas...');

  const ajiamarillo = await prisma.product.findUnique({ where: { sku: 'PDM-AJI-AMA-050G' } })!;
  const ajipanca = await prisma.product.findUnique({ where: { sku: 'PDM-AJI-PAN-050G' } })!;
  const salmar = await prisma.product.findUnique({ where: { sku: 'PDM-SAL-MAR-250G' } })!;
  const aceite = await prisma.product.findUnique({ where: { sku: 'PDM-ACE-ARB-500ML' } })!;
  const vinagre = await prisma.product.findUnique({ where: { sku: 'PDM-VIN-MAN-250ML' } })!;
  const salsaHuancaina = await prisma.product.findUnique({ where: { sku: 'PDM-SAL-HUA-200ML' } })!;

  const recipes = [
    {
      slug: 'papa-huancaina-clasica',
      title: 'Papa a la Huancaína Clásica',
      subtitle: 'El plato bandera de la cocina limeña, cremoso y picante',
      description: 'Papas amarillas bañadas en salsa de ají amarillo, queso fresco y leche evaporada. Acompañadas de aceitunas, huevo y lechuga.',
      story: 'Nacida en las huancas de la sierra central, esta receta llegó a Lima con los trabajadores del ferrocarril central. Hoy es el embajador de nuestra cocina en el mundo.',
      difficulty: 'FÁCIL',
      prepTime: 20,
      cookTime: 15,
      totalTime: 35,
      servings: 4,
      baseServings: 4,
      cuisineType: 'Peruana',
      mealType: ['ENTRADA', 'ALMUERZO'],
      occasion: ['DÍA A DÍA', 'FIESTAS PATRIAS', 'CENA ROMÁNTICA'],
      tags: ['vegetariano', 'sin gluten', 'clásico', 'ají amarillo'],
      nutritionInfo: { calories: 320, protein: 12, carbs: 35, fat: 18, fiber: 4, sugar: 6, sodium: 480 },
      tips: [
        'Usa papas amarillas (papa huayro o perricholi) para mejor textura',
        'El queso fresco debe ser de buena calidad, ni muy salado ni muy ácido',
        'La leche evaporada da más cuerpo que la leche fresca',
        'Ajusta el ají a tu gusto: 1 cda = suave, 2 cdas = medio, 3 cdas = picante',
      ],
      warnings: ['Contiene lácteos', 'Picante moderado'],
      isPublished: true,
      publishedAt: new Date(),
      authorId: superAdmin.id,
      ingredients: [
        { name: 'Papas amarillas medianas', quantity: new Decimal('800'), unit: 'g', productId: null },
        { name: 'Ají amarillo molido', quantity: new Decimal('2'), unit: 'cda', productId: ajiamarillo.id, originalQuantity: new Decimal('2'), originalUnit: 'cda' },
        { name: 'Queso fresco', quantity: new Decimal('200'), unit: 'g', productId: null },
        { name: 'Leche evaporada', quantity: new Decimal('1'), unit: 'lata', productId: null },
        { name: 'Galleta de soda', quantity: new Decimal('4'), unit: 'unidad', productId: null },
        { name: 'Aceite de oliva', quantity: new Decimal('3'), unit: 'cda', productId: aceite.id, originalQuantity: new Decimal('3'), originalUnit: 'cda' },
        { name: 'Sal de Maras', quantity: new Decimal('1'), unit: 'cda', productId: salmar.id, originalQuantity: new Decimal('1'), originalUnit: 'cda' },
        { name: 'Ajo', quantity: new Decimal('2'), unit: 'dientes', productId: null },
        { name: 'Aceitunas de botija', quantity: new Decimal('8'), unit: 'unidad', productId: null },
        { name: 'Huevos cocidos', quantity: new Decimal('2'), unit: 'unidad', productId: null },
        { name: 'Lechuga', quantity: new Decimal('4'), unit: 'hojas', productId: null },
      ],
      products: [
        { productId: ajiamarillo.id, quantity: 1, isRequired: true },
        { productId: aceite.id, quantity: 1, isRequired: true },
        { productId: salmar.id, quantity: 1, isRequired: false },
      ],
      steps: [
        { stepNumber: 1, title: 'Cocer las papas', description: 'Lava bien las papas y cocínalas en agua con sal hasta que estén tiernas pero firmes (20-25 min). Escurre, pela y corta en rodajas de 1 cm. Reserva tibias.', duration: 25 },
        { stepNumber: 2, title: 'Preparar la salsa', description: 'En la licuadora: ají amarillo, queso fresco desmenuzado, leche evaporada, galletas, aceite, sal, ajo. Licúa hasta obtener una crema homogénea y brillante. Prueba y ajusta sal.', duration: 5 },
        { stepNumber: 3, title: 'Montar el plato', description: 'En plato hondo o fuente: cama de lechuga, rodajas de papa, salsa huancaína generosa por encima. Decora con aceitunas, huevo en gajos y un chorrito de aceite de oliva.', duration: 5 },
      ],
    },
    {
      slug: 'lomo-saltado-tradicional',
      title: 'Lomo Saltado Tradicional',
      subtitle: 'El mestizaje perfecto: wok chino, ingredientes peruanos',
      description: 'Tiras de lomo fino salteadas a fuego alto con cebolla, tomate, ají amarillo, sillao y vinagre. Servido con papas fritas y arroz blanco.',
      story: 'Nacido en las "chifas" limeñas a inicios del siglo XX, el lomo saltado es el plato que mejor representa la fusión chino-peruana. El secreto: fuego bien alto y wok caliente.',
      difficulty: 'MEDIO',
      prepTime: 20,
      cookTime: 10,
      totalTime: 30,
      servings: 4,
      baseServings: 4,
      cuisineType: 'Peruana',
      mealType: ['ALMUERZO', 'CENA'],
      occasion: ['DÍA A DÍA', 'CENA ROMÁNTICA', 'FIESTAS PATRIAS'],
      tags: ['fusión', 'chino-peruano', 'wok', 'carne'],
      nutritionInfo: { calories: 580, protein: 35, carbs: 45, fat: 28, fiber: 4, sugar: 8, sodium: 890 },
      tips: [
        'Corta la carne en tiras finas contra la fibra para que quede tierna',
        'Seca bien la carne con papel absorbente antes de saltear',
        'El wok debe estar humeante antes de añadir el aceite',
        'Saltea en tandas pequeñas para no bajar la temperatura',
        'El vinagre al final "corta" la grasa y da brillo',
      ],
      warnings: ['Contiene soya (sillao)', 'Alto en sodio'],
      isPublished: true,
      publishedAt: new Date(),
      authorId: superAdmin.id,
      ingredients: [
        { name: 'Lomo fino de res', quantity: new Decimal('500'), unit: 'g', productId: null },
        { name: 'Ají amarillo molido', quantity: new Decimal('1'), unit: 'cda', productId: ajiamarillo.id, originalQuantity: new Decimal('1'), originalUnit: 'cda' },
        { name: 'Cebolla roja', quantity: new Decimal('2'), unit: 'unidad', productId: null },
        { name: 'Tomate', quantity: new Decimal('2'), unit: 'unidad', productId: null },
        { name: 'Sillao (salsa de soya)', quantity: new Decimal('3'), unit: 'cda', productId: null },
        { name: 'Vinagre de manzana', quantity: new Decimal('1'), unit: 'cda', productId: vinagre.id, originalQuantity: new Decimal('1'), originalUnit: 'cda' },
        { name: 'Aceite de oliva', quantity: new Decimal('3'), unit: 'cda', productId: aceite.id, originalQuantity: new Decimal('3'), originalUnit: 'cda' },
        { name: 'Ajo', quantity: new Decimal('3'), unit: 'dientes', productId: null },
        { name: 'Cilantro fresco', quantity: new Decimal('1'), unit: 'ramo', productId: null },
        { name: 'Papas amarillas para freír', quantity: new Decimal('4'), unit: 'unidad', productId: null },
        { name: 'Arroz blanco', quantity: new Decimal('2'), unit: 'tazas', productId: null },
        { name: 'Sal de Maras', quantity: new Decimal('1'), unit: 'cda', productId: salmar.id, originalQuantity: new Decimal('1'), originalUnit: 'cda' },
        { name: 'Pimienta negra', quantity: new Decimal('1'), unit: 'cdta', productId: null },
      ],
      products: [
        { productId: ajiamarillo.id, quantity: 1, isRequired: true },
        { productId: aceite.id, quantity: 1, isRequired: true },
        { productId: vinagre.id, quantity: 1, isRequired: true },
        { productId: salmar.id, quantity: 1, isRequired: false },
      ],
      steps: [
        { stepNumber: 1, title: 'Preparar ingredientes', description: 'Corta la carne en tiras de 1x4 cm. Sazona con sal, pimienta y 1 cda sillao. Corta cebolla en pluma, tomate en gajos, pica ajo y cilantro. Fríe papas en bastones y reserva. Cocina el arroz.', duration: 15 },
        { stepNumber: 2, title: 'Saltear la carne', description: 'Wok humeante, 1 cda aceite. Saltea la carne en tandas (30 seg c/u) hasta dorar. Retira y reserva.', duration: 3 },
        { stepNumber: 3, title: 'Saltear verduras', description: 'Mismo wok, 1 cda aceite. Cebolla 1 min, ajo 15 seg, tomate 30 seg, ají amarillo 15 seg. No dejes que el tomate suelte mucha agua.', duration: 2 },
        { stepNumber: 4, title: 'Integrar y terminar', description: 'Devuelve la carne al wok. Añade sillao restante, vinagre, cilantro. Saltea 30 seg más. Sirve inmediatamente con papas y arroz.', duration: 2 },
      ],
    },
    {
      slug: 'ceviche-clasico',
      title: 'Ceviche Clásico Peruano',
      subtitle: 'Pescado fresco "cocido" en limón, el orgullo de la costa',
      description: 'Corvina o lenguado en cubos, curado en jugo de limón de Pica, ají limo, cebolla roja, culantro y sal. Con camote, choclo y cancha.',
      story: 'Patrimonio Cultural de la Nación. El ceviche es la expresión más pura de nuestro mar: fresco, ácido, picante y vibrante. Cada región tiene su versión, pero la base es sagrada.',
      difficulty: 'FÁCIL',
      prepTime: 20,
      cookTime: 0,
      restTime: 15,
      totalTime: 35,
      servings: 4,
      baseServings: 4,
      cuisineType: 'Marina',
      mealType: ['ALMUERZO', 'ENTRADA'],
      occasion: ['DÍA A DÍA', 'FIESTAS PATRIAS', 'CENA ROMÁNTICA'],
      tags: ['pescado', 'crudo', 'limón', 'marino', 'patrimonio', 'sin cocción'],
      nutritionInfo: { calories: 280, protein: 32, carbs: 28, fat: 6, fiber: 4, sugar: 6, sodium: 520 },
      tips: [
        'Pescado fresquísimo: olor a mar, ojos brillantes, agallas rojas',
        'Limón de Pica o limón sutil: más aroma, menos acidez agresiva',
        'Cebolla en pluma fina, enjuagada con agua fría y escurrida (quita el "picor" crudo)',
        'Ají limo sin venas ni semillas para picor limpio',
        'El punto: 12-15 min. Pasado se vuelve gomoso, crudo no "cocina"',
        'Sirve inmediatamente en plato frío',
      ],
      warnings: ['Pescado crudo (curado en ácido)', 'Alto en sodio', 'Alergia a pescados'],
      isPublished: true,
      publishedAt: new Date(),
      authorId: superAdmin.id,
      ingredients: [
        { name: 'Corvina o lenguado fresco', quantity: new Decimal('500'), unit: 'g', productId: null },
        { name: 'Jugo de limón de Pica', quantity: new Decimal('120'), unit: 'ml', productId: null },
        { name: 'Ají limo fresco', quantity: new Decimal('2'), unit: 'unidad', productId: null },
        { name: 'Cebolla roja', quantity: new Decimal('1'), unit: 'unidad', productId: null },
        { name: 'Culantro fresco', quantity: new Decimal('1'), unit: 'ramo', productId: null },
        { name: 'Sal de Maras', quantity: new Decimal('1'), unit: 'cda', productId: salmar.id, originalQuantity: new Decimal('1'), originalUnit: 'cda' },
        { name: 'Pimienta negra', quantity: new Decimal('1'), unit: 'cdta', productId: null },
        { name: 'Camote amarillo cocido', quantity: new Decimal('2'), unit: 'unidad', productId: null },
        { name: 'Choclo desgranado cocido', quantity: new Decimal('1'), unit: 'taza', productId: null },
        { name: 'Cancha (maíz tostado)', quantity: new Decimal('1'), unit: 'taza', productId: null },
        { name: 'Lechuga', quantity: new Decimal('4'), unit: 'hojas', productId: null },
      ],
      products: [
        { productId: salmar.id, quantity: 1, isRequired: true },
      ],
      steps: [
        { stepNumber: 1, title: 'Preparar cebolla', description: 'Corta cebolla en pluma fina. Enjuaga con agua fría 2 min, escurre bien y reserva en agua con hielo. Esto elimina el sabor agresivo.', duration: 5 },
        { stepNumber: 2, title: 'Cortar y curar pescado', description: 'Corta pescado en cubos de 1.5-2 cm. Coloca en bol no reactivo. Cubre con jugo de limón, añade sal, pimienta, ají limo picado (sin venas/semillas). Mezcla suavemente.', duration: 3 },
        { stepNumber: 3, title: 'El punto perfecto', description: 'Deja reposar 12-15 min a temp. ambiente. El pescado debe verse opaco, blanco, firme pero tierno. Prueba y ajusta limón/sal.', duration: 15 },
        { stepNumber: 4, title: 'Servir', description: 'Escurre exceso de jugo (deja solo lo necesario). Añade cebolla escurrida, culantro picado. Mezcla una vez. Sirve en plato frío con camote, choclo, cancha y lechuga.', duration: 2 },
      ],
    },
  ];

  for (const recipeData of recipes) {
    const { ingredients, products: recipeProducts, steps, ...recipeBase } = recipeData;

    const recipe = await prisma.recipe.upsert({
      where: { slug: recipeBase.slug },
      update: {},
      create: recipeBase,
    });

    for (let i = 0; i < ingredients.length; i++) {
      await prisma.recipeIngredient.create({
        data: { ...ingredients[i], recipeId: recipe.id, sortOrder: i },
      });
    }

    for (const rp of recipeProducts) {
      await prisma.recipeProduct.upsert({
        where: { recipeId_productId_variantId: { recipeId: recipe.id, productId: rp.productId, variantId: rp.variantId || null } },
        update: {},
        create: { ...rp, recipeId: recipe.id },
      });
    }

    for (const step of steps) {
      await prisma.recipeStep.create({ data: { ...step, recipeId: recipe.id } });
    }

    // QR para la receta
    await prisma.qrCode.upsert({
      where: { code: `https://pizcadelmonte.pe/recetas/${recipe.slug}` },
      update: {},
      create: {
        code: `https://pizcadelmonte.pe/recetas/${recipe.slug}`,
        type: 'recipe',
        referenceId: recipe.id,
        title: `Receta: ${recipe.title}`,
        isActive: true,
        createdBy: superAdmin.id,
      },
    });
  }

  // ============================================
  // 16. PÁGINAS LEGALES Y CMS
  // ============================================
  console.log('📄 Creando páginas legales...');

  const legalPages = [
    { slug: 'terminos-y-condiciones', title: 'Términos y Condiciones', template: 'legal', isSystem: true },
    { slug: 'politica-de-privacidad', title: 'Política de Privacidad', template: 'legal', isSystem: true },
    { slug: 'politica-de-cookies', title: 'Política de Cookies', template: 'legal', isSystem: true },
    { slug: 'libro-de-reclamaciones', title: 'Libro de Reclamaciones', template: 'legal', isSystem: true },
    { slug: 'medios-de-pago', title: 'Medios de Pago', template: 'default', isSystem: true },
    { slug: 'envios-y-cobertura', title: 'Envíos, Cobertura y Plazos', template: 'default', isSystem: true },
    { slug: 'cambios-y-devoluciones', title: 'Cambios, Devoluciones y Garantías', template: 'legal', isSystem: true },
    { slug: 'nuestra-historia', title: 'Nuestra Historia', template: 'about', isSystem: false },
    { slug: 'contacto', title: 'Contacto', template: 'contact', isSystem: true },
    { slug: 'preguntas-frecuentes', title: 'Preguntas Frecuentes', template: 'faq', isSystem: true },
  ];

  for (const page of legalPages) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: {},
      create: { ...page, status: 'PUBLISHED', publishedAt: new Date(), content: `<h1>${page.title}</h1><p>Contenido pendiente de edición desde el panel de administración.</p>` },
    });
  }

  // ============================================
  // 17. MENÚS
  // ============================================
  console.log('🧭 Creando menús...');

  const mainMenu = await prisma.menu.upsert({
    where: { slug: 'main-header' },
    update: {},
    create: { name: 'Menú Principal Header', slug: 'main-header', location: 'header', isActive: true },
  });

  const footerMenu = await prisma.menu.upsert({
    where: { slug: 'footer-main' },
    update: {},
    create: { name: 'Menú Footer Principal', slug: 'footer-main', location: 'footer', isActive: true },
  });

  const mobileMenu = await prisma.menu.upsert({
    where: { slug: 'mobile-drawer' },
    update: {},
    create: { name: 'Menú Móvil Drawer', slug: 'mobile-drawer', location: 'mobile', isActive: true },
  });

  // Items menú principal
  const mainItems = [
    { label: 'Inicio', url: '/', targetPage: 'home', sortOrder: 1 },
    { label: 'Tienda', url: '/tienda', targetPage: 'catalog', sortOrder: 2 },
    { label: 'Ofertas', url: '/ofertas', targetPage: 'catalog', sortOrder: 3 },
    { label: 'Packs Gourmet', url: '/packs', targetPage: 'collection', sortOrder: 4 },
    { label: 'Recetario', url: '/recetas', targetPage: 'recipe', sortOrder: 5 },
    { label: 'Nuestra Historia', url: '/nuestra-historia', targetPage: 'page', targetId: (await prisma.page.findUnique({ where: { slug: 'nuestra-historia' } }))?.id, sortOrder: 6 },
    { label: 'Contacto', url: '/contacto', targetPage: 'page', targetId: (await prisma.page.findUnique({ where: { slug: 'contacto' } }))?.id, sortOrder: 7 },
  ];

  for (const item of mainItems) {
    await prisma.menuItem.upsert({
      where: { id: `menu-${mainMenu.id}-${item.sortOrder}` },
      update: {},
      create: { id: `menu-${mainMenu.id}-${item.sortOrder}`, menuId: mainMenu.id, ...item, isActive: true },
    });
  }

  // Footer items
  const footerItems = [
    { label: 'Términos y Condiciones', url: '/terminos-y-condiciones', targetPage: 'page', targetId: (await prisma.page.findUnique({ where: { slug: 'terminos-y-condiciones' } }))?.id, sortOrder: 1 },
    { label: 'Privacidad', url: '/politica-de-privacidad', targetPage: 'page', targetId: (await prisma.page.findUnique({ where: { slug: 'politica-de-privacidad' } }))?.id, sortOrder: 2 },
    { label: 'Cookies', url: '/politica-de-cookies', targetPage: 'page', targetId: (await prisma.page.findUnique({ where: { slug: 'politica-de-cookies' } }))?.id, sortOrder: 3 },
    { label: 'Libro de Reclamaciones', url: '/libro-de-reclamaciones', targetPage: 'page', targetId: (await prisma.page.findUnique({ where: { slug: 'libro-de-reclamaciones' } }))?.id, sortOrder: 4 },
    { label: 'Envíos', url: '/envios-y-cobertura', targetPage: 'page', targetId: (await prisma.page.findUnique({ where: { slug: 'envios-y-cobertura' } }))?.id, sortOrder: 5 },
    { label: 'Devoluciones', url: '/cambios-y-devoluciones', targetPage: 'page', targetId: (await prisma.page.findUnique({ where: { slug: 'cambios-y-devoluciones' } }))?.id, sortOrder: 6 },
    { label: 'Medios de Pago', url: '/medios-de-pago', targetPage: 'page', targetId: (await prisma.page.findUnique({ where: { slug: 'medios-de-pago' } }))?.id, sortOrder: 7 },
    { label: 'FAQ', url: '/preguntas-frecuentes', targetPage: 'page', targetId: (await prisma.page.findUnique({ where: { slug: 'preguntas-frecuentes' } }))?.id, sortOrder: 8 },
  ];

  for (const item of footerItems) {
    await prisma.menuItem.upsert({
      where: { id: `menu-${footerMenu.id}-${item.sortOrder}` },
      update: {},
      create: { id: `menu-${footerMenu.id}-${item.sortOrder}`, menuId: footerMenu.id, ...item, isActive: true },
    });
  }

  // ============================================
  // 18. REDES SOCIALES
  // ============================================
  console.log('📱 Creando redes sociales...');

  const socialLinks = [
    { platform: 'facebook', name: 'Facebook', url: 'https://facebook.com/pizcadelmonte', handle: '@pizcadelmonte', sortOrder: 1 },
    { platform: 'instagram', name: 'Instagram', url: 'https://instagram.com/pizcadelmonte', handle: '@pizcadelmonte', sortOrder: 2 },
    { platform: 'tiktok', name: 'TikTok', url: 'https://tiktok.com/@pizcadelmonte', handle: '@pizcadelmonte', sortOrder: 3 },
    { platform: 'whatsapp', name: 'WhatsApp Business', url: 'https://wa.me/51999888777', handle: '+51 999 888 777', sortOrder: 4 },
    { platform: 'youtube', name: 'YouTube', url: 'https://youtube.com/@pizcadelmonte', handle: '@pizcadelmonte', sortOrder: 5 },
  ];

  for (const social of socialLinks) {
    await prisma.socialLink.upsert({ where: { platform: social.platform }, update: {}, create: { ...social, isActive: true } });
  }

  // ============================================
  // 19. CONFIGURACIÓN SEO
  // ============================================
  console.log('🔍 Creando configuración SEO...');

  const seoConfigs = [
    { pageType: 'home', titleTemplate: 'Pizca del Monte - Especias, Sales y Aceites Gourmet Peruanos', descriptionTemplate: 'Descubre la mejor selección de especias, sales de Maras, aceites de oliva y productos gourmet peruanos. Envío a todo el Perú.', keywords: ['especias peruanas', 'sal de Maras', 'aceite de oliva', 'ají amarillo', 'productos gourmet', 'cocina peruana'] },
    { pageType: 'catalog', titleTemplate: 'Tienda - {category} | Pizca del Monte', descriptionTemplate: 'Explora nuestra categoría de {category}. Productos gourmet peruanos de la más alta calidad.', keywords: ['comprar especias', 'venta online', 'productos peruanos'] },
    { pageType: 'product', titleTemplate: '{product} | Pizca del Monte', descriptionTemplate: '{product} - {shortDescription}. Compra online con envío a todo el Perú.', keywords: ['comprar', 'precio', 'envío'] },
    { pageType: 'recipe', titleTemplate: 'Receta: {recipe} | Pizca del Monte', descriptionTemplate: 'Aprende a preparar {recipe} con ingredientes Pizca del Monte. Paso a paso, tips y productos recomendados.', keywords: ['receta peruana', 'cómo preparar', 'ingredientes'] },
    { pageType: 'cart', titleTemplate: 'Mi Carrito | Pizca del Monte', descriptionTemplate: 'Revisa tu carrito de compras. Envío gratis desde S/150. Pago seguro con Mercado Pago, Yape, Plin.', keywords: [] },
    { pageType: 'checkout', titleTemplate: 'Finalizar Compra | Pizca del Monte', descriptionTemplate: 'Completa tu pedido de forma segura. Múltiples medios de pago. Facturación electrónica SUNAT.', keywords: [] },
    { pageType: 'account', titleTemplate: 'Mi Cuenta | Pizca del Monte', descriptionTemplate: 'Gestiona tu perfil, pedidos, direcciones, favoritos y preferencias.', keywords: [] },
    { pageType: 'search', titleTemplate: 'Buscar: {query} | Pizca del Monte', descriptionTemplate: 'Resultados para "{query}" en nuestra tienda de productos gourmet peruanos.', keywords: [] },
    { pageType: '404', titleTemplate: 'Página no encontrada | Pizca del Monte', descriptionTemplate: 'Lo sentimos, la página que buscas no existe. Volve a la tienda o usa el buscador.', keywords: [] },
  ];

  for (const seo of seoConfigs) {
    await prisma.sEOConfig.upsert({
      where: { pageType: seo.pageType },
      update: {},
      create: { ...seo, ogImage: '', structuredData: {} },
    });
  }

  // ============================================
  // 20. CUENTA DE PRUEBA CLIENTE
  // ============================================
  console.log('👤 Creando cliente de prueba...');

  const testCustomerPass = await hash('ClienteTest2024!', 12);
  const testUser = await prisma.user.upsert({
    where: { email: 'cliente@test.pe' },
    update: {},
    create: {
      email: 'cliente@test.pe',
      name: 'Cliente Prueba',
      passwordHash: testCustomerPass,
      status: UserStatus.ACTIVE,
      emailVerified: new Date(),
      phone: '+51912345678',
      locale: 'es-PE',
    },
  });

  await prisma.customer.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      documentType: 'DNI',
      documentNumber: '12345678',
      firstName: 'Juan',
      lastName: 'Pérez',
      email: 'cliente@test.pe',
      phone: '+51912345678',
      isWholesale: false,
      marketingConsent: true,
    },
  });

  await prisma.address.upsert({
    where: { id: 'addr-test-1' },
    update: {},
    create: {
      id: 'addr-test-1',
      userId: testUser.id,
      type: 'both',
      isDefault: true,
      firstName: 'Juan',
      lastName: 'Pérez',
      addressLine1: 'Av. Arequipa 1234',
      addressLine2: 'Dpto 501',
      neighborhood: 'Lince',
      district: 'Lince',
      province: 'Lima',
      department: 'Lima',
      postalCode: '15046',
      country: 'PE',
      phone: '+51912345678',
      ubigeo: '150114',
    },
  });

  // ============================================
  // 21. BANNERS DE EJEMPLO
  // ============================================
  console.log('🎨 Creando banners...');

  const banners = [
    { name: 'Hero Inicio - Especias', slug: 'hero-especias', title: 'El Sabor del Perú en tu Cocina', subtitle: 'Especias, sales y aceites seleccionados con amor', image: '/images/banners/hero-especias.jpg', position: 'hero', targetPage: 'catalog', sortOrder: 1, isActive: true },
    { name: 'Hero Inicio - Packs', slug: 'hero-packs', title: 'Regala Sabor', subtitle: 'Packs gourmet para los amantes de la buena mesa', image: '/images/banners/hero-packs.jpg', position: 'hero', targetPage: 'collection', targetId: (await prisma.collection.findUnique({ where: { slug: 'regalos-gourmet' } }))?.id, sortOrder: 2, isActive: true },
    { name: 'Categoría - Ajíes', slug: 'cat-ajies', title: 'Nuestros Ajíes', subtitle: 'Del amarillo al rocoto, el picor peruano', image: '/images/banners/cat-ajies.jpg', position: 'category', targetPage: 'category', targetId: (await prisma.category.findUnique({ where: { slug: 'ajies-picantes' } }))?.id, sortOrder: 1, isActive: true },
    { name: 'Promo - Envío Gratis', slug: 'promo-envio-gratis', title: 'Envío Gratis + S/150', subtitle: 'En todo Perú. Aprovecha ahora', image: '/images/banners/promo-envio.jpg', position: 'footer', sortOrder: 1, isActive: true },
  ];

  for (const banner of banners) {
    await prisma.banner.upsert({ where: { slug: banner.slug }, update: {}, create: banner });
  }

  console.log('✅ Seed completado exitosamente!');
  console.log('');
  console.log('📋 Resumen:');
  console.log('  - Roles y permisos: 7 roles configurados');
  console.log('  - Superadmin: admin@pizcadelmonte.pe / PizcaDelMonte2024!');
  console.log('  - Cliente prueba: cliente@test.pe / ClienteTest2024!');
  console.log('  - Categorías: 6 principales + 18 subcategorías');
  console.log('  - Marcas: 5');
  console.log('  - Atributos: 6 con múltiples valores');
  console.log('  - Productos: 9 productos con variantes');
  console.log('  - Colecciones: 4');
  console.log('  - Promociones: 2 (bienvenida, envío gratis)');
  console.log('  - Listas de precios: 1 (mayorista)');
  console.log('  - Transportistas: 4 (Shalom, Olva, Serpost, Pickup)');
  console.log('  - Almacenes: 2');
  console.log('  - Recetas: 3 publicadas (Huancaína, Lomo Saltado, Ceviche)');
  console.log('  - Páginas legales: 10');
  console.log('  - Menús: 3 (header, footer, mobile)');
  console.log('  - Redes sociales: 5');
  console.log('  - Plantillas etiquetas: 3');
  console.log('  - Configuración SEO: 9 tipos de página');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });