# Pizca del Monte 🌿

> **Especias, Sales y Aceites Gourmet Peruanos** - Plataforma de e-commerce completa para la venta de productos gourmet peruanos con cumplimiento SUNAT, integración Shalom, y arquitectura multi-app.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm)](https://pnpm.io/)

---

## 📋 Tabla de Contenidos

- [Visión General](#-visión-general)
- [Arquitectura](#-arquitectura)
- [Stack Tecnológico](#-stack-tecnológico)
- [Estructura del Monorepo](#-estructura-del-monorepo)
- [Instalación](#-instalación)
- [Variables de Entorno](#-variables-de-entorno)
- [Base de Datos](#-base-de-datos)
- [Desarrollo](#-desarrollo)
- [Despliegue](#-despliegue)
- [Integraciones](#-integraciones)
- [Scripts Disponibles](#-scripts-disponibles)

---

## 🎯 Visión General

**Pizca del Monte** es una plataforma de e-commerce gourmet peruana que vende especias, sales de Maras, aceites de oliva virgen extra, vinagres artesanales, salsas tradicionales y packs de regalo curados.

### Características Principales

| Módulo | Descripción |
|--------|-------------|
| 🛍️ **Catálogo** | Productos con variantes, atributos, bundles, packs, colecciones |
| 🛒 **Carrito & Checkout** | Compra como invitado/registrado, múltiples direcciones, cupones |
| 💳 **Pagos** | Mercado Pago, Yape, Plin, Transferencia, Pago contra entrega |
| 🚚 **Logística** | Shalom (principal), Olva Courier, Serpost, Recojo en tienda |
| 🧾 **Facturación SUNAT** | Boletas/Facturas electrónicas, PSE (NubeFact), Libro de Reclamaciones |
| 👥 **Clientes** | Perfiles, direcciones (UBIGEO), mayorista, wishlist, reseñas |
| 📦 **Inventario** | Multi-almacén, lotes, trazabilidad, stock mínimo, etiquetas QR |
| 🍳 **Recetario** | Recetas con ingredientes vinculados a productos, modo cocina |
| 🎁 **Packs & Bundles** | Kits curados, regalos corporativos, precios por volumen |
| 📊 **Admin Dashboard** | Analytics, gestión de pedidos, clientes, productos, inventario |

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
                        MONOREPO (pnpm workspaces)
├─────────────────┬─────────────────┬─────────────────────────────┤
│   apps/web      │   apps/admin    │      packages/*             │
│  (Next.js 15)   │  (Next.js 15)   │  ┌─────────────────────┐    │
│  - Tienda       │  - Dashboard    │  │ @pizca/database     │    │
│  - Recetario    │  - Gestión      │  │   - Prisma Client   │    │
│  - Blog/CMS     │  - Analytics    │  │   - Seed & Migrat.  │    │
│  - PWA          │  - Config       │  └─────────────────────┘    │
└────────┬────────┴────────┬─────────┬──────────────┬────────────┘
         │                 │         │              │
         └─────────────────┴─────────┴──────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   INFRASTRUCTURE  │
                    ├───────────────────┤
                    │ PostgreSQL (Neon) │
                    │ Redis (Upstash)   │
                    │ Cloudinary (Imgs) │
                    │ Render (Hosting)  │
                    │ GitHub Actions    │
                    └───────────────────┘
```

### Decisiones Arquitectónicas

| Decisión | Justificación |
|----------|---------------|
| **Monorepo pnpm** | Código compartido, builds atómicos, instalación rápida |
| **Next.js App Router** | RSC, Server Actions, Streaming, SEO nativo |
| **Prisma ORM** | Type-safe DB, migraciones, seeding, studio visual |
| **Tailwind + Radix** | Design system consistente, accesible, performante |
| **Zod + React Hook Form** | Validación end-to-end, DX excelente |
| **TanStack Query** | Server state, caching, invalidation automática |
| **NextAuth v5** | Auth seguro, multiple providers, edge-ready |

---

## 🛠️ Stack Tecnológico

### Frontend
- **Next.js 15.5** (App Router, RSC, Server Actions)
- **React 18.3** + **TypeScript 5.5**
- **Tailwind CSS 3.4** + **Radix UI** (componentes accesibles)
- **Lucide React** (iconos)
- **TanStack Query v5** + **React Hook Form v7** + **Zod v4**

### Backend & Database
- **Prisma Client 5.22** + **PostgreSQL 16** (Neon Free Tier)
- **NextAuth.js v5** (credentials, OAuth, JWT)
- **Server Actions** para mutaciones
- **Upstash Redis** (caché, rate limiting, sesiones)

### Integraciones
- **Mercado Pago** (gateway principal Perú)
- **Yape / Plin** (pagos móviles)
- **Shalom** (logística principal)
- **Olva Courier / Serpost** (logística alternativa)
- **SUNAT / NubeFact** (facturación electrónica)
- **Cloudinary** (gestión de imágenes)
- **Resend / Nodemailer** (emails transaccionales)

### DevOps
- **GitHub Actions** (CI/CD)
- **Render** (hosting web services + cron jobs)
- **pnpm 10** + **Turborepo** (build system)
- **Husky** + **ESLint** + **Prettier** (code quality)

---

## 📁 Estructura del Monorepo

```
pizca-del-monte/
├── .github/workflows/          # CI/CD pipelines
├── apps/
│   ├── web/                    # Tienda pública (Next.js)
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   │   ├── (app)/      # Layout público
│   │   │   │   ├── (auth)/     # Login, register
│   │   │   │   ├── api/        # Server Actions / API Routes
│   │   │   │   └── page.tsx    # Homepage
│   │   │   ├── components/     # Componentes React
│   │   │   │   ├── ui/         # Primitivas (Button, Input, Card...)
│   │   │   │   ├── home/       # Secciones homepage
│   │   │   │   ├── layout/     # Header, Footer
│   │   │   │   └── products/   # Product cards, grids
│   │   │   ├── lib/            # Utils, configs
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── styles/         # globals.css
│   │   │   └── i18n/           # next-intl config
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.ts
│   │   └── next.config.ts
│   │
│   └── admin/                  # Panel de administración (Next.js)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (admin)/    # Dashboard layout
│       │   │   └── api/        # Admin API routes
│       │   ├── components/     # Admin components
│       │   └── styles/
│       ├── package.json
│       └── ...
│
├── packages/
│   ├── database/               # Prisma ORM package
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # 80+ modelos
│   │   │   └── seed.ts         # Datos demo completos
│   │   ├── src/index.ts        # Client + extensiones
│   │   └── package.json
│   │
│   ├── config/                 # Configuración compartida
│   │   └── src/index.ts        # Env validation, constants
│   │
│   ├── ui/                     # Design system compartido
│   │   └── src/                # Utils, exports
│   │
│   └── utils/                  # Utilidades compartidas
│       └── src/index.ts        # Decimal, dates, strings, validation
│
├── prisma/
│   └── schema.prisma           # Schema raíz (symlink a packages/database)
│
├── .env.example                # Template de variables
├── package.json                # Root workspace config
├── tsconfig.json               # Project references
├── pnpm-workspace.yaml         # Workspace config
└── README.md
```

---

## 🚀 Instalación

### Prerrequisitos

- **Node.js 20+** (recomendado: usar `fnm` o `nvm`)
- **pnpm 10+** (`npm install -g pnpm@10` o `corepack enable pnpm`)
- **PostgreSQL 16** (local o Neon)
- **Git**

### Pasos

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/pizca-del-monte.git
cd pizca-del-monte

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 4. Generar Prisma Client
pnpm db:generate

# 5. Ejecutar migraciones y seed
pnpm db:migrate
pnpm db:seed

# 6. Iniciar desarrollo
pnpm dev
```

### Acceso a las Apps

| App | URL | Descripción |
|-----|-----|-------------|
| **Web** | http://localhost:3000 | Tienda pública |
| **Admin** | http://localhost:3001 | Panel de administración |
| **Prisma Studio** | http://localhost:5555 | `pnpm db:studio` |

---

## 🔐 Variables de Entorno

Copiar `.env.example` a `.env` y completar:

```bash
# obligatorias
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"

# pagos
MERCADOPAGO_PUBLIC_KEY="TEST-xxx"
MERCADOPAGO_ACCESS_TOKEN="TEST-xxx"
MERCADOPAGO_WEBHOOK_SECRET="whsec-xxx"

# envío
SHALOM_API_KEY="xxx"
SHALOM_API_SECRET="xxx"
SHALOM_TEST_MODE="true"

# imágenes
CLOUDINARY_CLOUD_NAME="xxx"
CLOUDINARY_API_KEY="xxx"
CLOUDINARY_API_SECRET="xxx"

# emails
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="xxx"
SMTP_PASS="xxx"
```

Ver [`.env.example`](.env.example) para lista completa.

En producción, configurar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` para las cuotas distribuidas de inicio de sesión y registro. El login limita por IP (30 intentos/15 min) y correo (10/15 min); el registro, por IP (10/hora) y correo (3/hora). Si Redis falta o no responde, ambos flujos se deniegan: el registro devuelve HTTP 503 y login muestra un error genérico. En desarrollo y tests se puede omitir Upstash.

El límite por IP usa `X-Forwarded-For` o `X-Real-IP`. El proxy de producción debe reemplazar estas cabeceras en vez de conservar valores enviados por el cliente. El limitador usa [Upstash Ratelimit](https://upstash.com/docs/redis/sdks/ratelimit-ts/gettingstarted) con Redis REST compartido entre instancias.

---

## 🗄️ Base de Datos

### Esquema Principal (80+ modelos)

#### Core
- **User, Role, Permission** - RBAC completo
- **Customer, Address** - Perfil comprador + UBIGEO

#### Catálogo
- **Product, ProductVariant, ProductMedia** - Productos con variantes
- **Category, Brand, Collection** - Taxonomía
- **Attribute, AttributeValue** - Filtros dinámicos
- **BundleItem** - Packs compuestos

#### Precios & Promos
- **PriceList, PriceListItem** - Listas mayoristas
- **Promotion, Coupon** - Descuentos, envío gratis, BOGO

#### Inventario
- **Warehouse, InventoryItem, InventoryLot** - Multi-almacén + lotes
- **StockMovement** - Trazabilidad completa

#### Pedidos
- **Order, OrderItem, OrderStatusHistory** - Estados auditables
- **Payment, PaymentTransaction** - Múltiples pasarelas
- **Shipment, ShipmentEvent** - Tracking Shalom/Olva

#### Facturación SUNAT
- **Invoice, InvoiceItem** - Boletas/Facturas electrónicas
- **InvoiceSequence** - Numeración por serie
- **SunatResponse** - Logs de envío

#### Contabilidad
- **Account, AccountingEntry, AccountingEntryLine** - Partida doble
- **CashMovement, Expense** - Flujo de caja

#### Etiquetas & QR
- **LabelTemplate, LabelPrintJob** - Plantillas PDF/ZPL
- **QRCode** - Trazabilidad, recetas, productos

#### CMS & Marketing
- **Page, Menu, MenuItem, Banner** - Contenido gestionable
- **Recipe, RecipeStep, RecipeIngredient** - Recetario
- **Review, Wishlist** - Social proof

#### Configuración
- **StoreSetting, TaxConfiguration, Carrier, ShippingZone, ShippingRate**
- **WebhookEvent, AuditLog, IntegrationConfig**

### Comandos Prisma

```bash
# Generar client
pnpm db:generate

# Push schema (dev)
pnpm db:push

# Migraciones (dev)
pnpm db:migrate

# Migraciones (prod)
pnpm db:migrate:prod

# Seed datos demo
pnpm db:seed

# Studio visual
pnpm db:studio

# Formatear schema
pnpm db:format

# Validar schema
pnpm db:validate
```

---

## 💻 Desarrollo

### Iniciar todas las apps

```bash
pnpm dev          # Web (3000) + Admin (3001) concurrentemente
pnpm dev:web      # Solo web
pnpm dev:admin    # Solo admin
```

### Code Quality

```bash
pnpm lint         # ESLint en todos los workspaces
pnpm type-check   # TypeScript en todos los workspaces
pnpm build        # Build de producción
```

### Testing

```bash
pnpm test         # Unit/Integration tests (Jest)
pnpm test:e2e     # E2E tests (Playwright) - solo web
```

### Base de Datos

```bash
pnpm db:studio    # Prisma Studio en puerto 5555
```

### Git Hooks (Husky)

```bash
# Pre-commit: lint-staged
# Commit-msg: conventional commits
# Pre-push: type-check + lint
```

---

## 🚀 Despliegue

### Render (Recomendado)

#### Web Service (Next.js)

```yaml
# render.yaml
services:
  - type: web
    name: pizca-web
    env: node
    buildCommand: pnpm install && pnpm build:web
    startCommand: pnpm start --workspace=apps/web
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase: pizca-db
      - key: NEXTAUTH_SECRET
        generateValue: true
      - key: NEXTAUTH_URL
        value: https://pizcadelmonte.pe
```

#### Admin Service

```yaml
  - type: web
    name: pizca-admin
    env: node
    buildCommand: pnpm install && pnpm build:admin
    startCommand: pnpm start --workspace=apps/admin
    envVars:
      - key: NODE_ENV
        value: production
```

#### Cron Jobs (Render)

```yaml
  - type: cron
    name: process-orders
    schedule: "*/5 * * * *"
    command: curl -X POST https://pizcadelmonte.pe/api/cron/process-orders -H "Authorization: Bearer $CRON_SECRET"
```

### Variables de Producción

| Variable | Descripción |
|----------|-------------|
| `NODE_ENV=production` | Modo producción |
| `DATABASE_URL` | Conexión pooled (PgBouncer) |
| `NEXTAUTH_SECRET` | 32+ chars aleatorios |
| `NEXTAUTH_URL` | URL pública HTTPS |
| `MERCADOPAGO_*` | Credenciales producción |
| `SHALOM_*` | Credenciales producción |
| `CLOUDINARY_*` | Cuenta producción |
| `SENTRY_DSN` | Error tracking |

### Health Checks

```bash
# Web
curl https://pizcadelmonte.pe/api/health

# Admin
curl https://admin.pizcadelmonte.pe/api/health

# Database
curl https://pizcadelmonte.pe/api/health/ready
```

---

## 🔌 Integraciones

### Mercado Pago (Pagos)

```typescript
// apps/web/src/lib/payments/mercadopago.ts
import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export async function createPreference(order: Order) {
  const preference = new Preference(client);
  return preference.create({
    body: {
      items: order.items.map(item => ({
        title: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice.toNumber(),
        currency_id: 'PEN',
      })),
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/failure`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/pending`,
      },
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
      external_reference: order.orderNumber,
    },
  });
}
```

### Shalom (Envíos)

```typescript
// apps/web/src/lib/shipping/shalom.ts
export async function createShipment(order: Order, address: Address) {
  const response = await fetch(`${process.env.SHALOM_BASE_URL}/shipments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SHALOM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      origin_ubigeo: process.env.SHIPPING_ORIGIN_UBIGEO,
      destination_ubigeo: address.ubigeo,
      weight: order.totalWeight,
      dimensions: order.dimensions,
      service_level: 'standard',
      reference: order.orderNumber,
    }),
  });
  return response.json();
}

export async function trackShipment(trackingNumber: string) {
  const response = await fetch(`${process.env.SHALOM_BASE_URL}/tracking/${trackingNumber}`, {
    headers: { 'Authorization': `Bearer ${process.env.SHALOM_API_KEY}` },
  });
  return response.json();
}
```

### SUNAT / NubeFact (Facturación)

```typescript
// apps/web/src/lib/invoicing/nubefact.ts
export async function emitirComprobante(data: InvoiceData) {
  const response = await fetch(`${process.env.PSE_BASE_URL}/factura`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PSE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operacion: 'generar_comprobante',
      tipo_de_comprobante: data.type === 'invoice' ? '01' : '03',
      serie: data.series,
      numero: data.number,
      cliente_tipo_de_documento: data.customer.docType === 'RUC' ? '6' : '1',
      cliente_numero_de_documento: data.customer.docNumber,
      cliente_denominacion: data.customer.name,
      cliente_email: data.customer.email,
      fecha_de_emision: formatDate(new Date()),
      moneda: '1', // PEN
      items: data.items.map(item => ({
        unidad_de_medida: 'NIU',
        codigo: item.sku,
        descripcion: item.name,
        cantidad: item.quantity,
        valor_unitario: item.unitPrice.toNumber(),
        precio_unitario: item.unitPrice.mul(1.18).toNumber(), // con IGV
        tipo_de_igv: '1', // Gravado
        igv: item.taxAmount.toNumber(),
        total: item.total.toNumber(),
      })),
    }),
  });
  return response.json();
}
```

---

## 📜 Scripts Disponibles

### Root (`package.json`)

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Inicia web + admin concurrentemente |
| `pnpm dev:web` | Solo tienda pública (puerto 3000) |
| `pnpm dev:admin` | Solo admin (puerto 3001) |
| `pnpm build` | Build producción de todos los workspaces |
| `pnpm build:web` | Build solo web |
| `pnpm build:admin` | Build solo admin |
| `pnpm lint` | ESLint en todos los workspaces |
| `pnpm type-check` | TypeScript check en todos |
| `pnpm db:generate` | Genera Prisma Client |
| `pnpm db:push` | Push schema a DB (sin migraciones) |
| `pnpm db:migrate` | Crea y ejecuta migración (dev) |
| `pnpm db:migrate:prod` | Ejecuta migraciones (prod) |
| `pnpm db:seed` | Ejecuta seed.ts con datos demo |
| `pnpm db:studio` | Abre Prisma Studio |
| `pnpm test` | Tests unitarios (Jest) |
| `pnpm test:e2e` | Tests E2E (Playwright) |

### Database Package (`packages/database/package.json`)

| Comando | Descripción |
|---------|-------------|
| `pnpm db:generate` | `prisma generate` |
| `pnpm db:push` | `prisma db push` |
| `pnpm db:migrate` | `prisma migrate dev` |
| `pnpm db:migrate:prod` | `prisma migrate deploy` |
| `pnpm db:seed` | `tsx prisma/seed.ts` |
| `pnpm db:studio` | `prisma studio` |
| `pnpm db:format` | `prisma format` |
| `pnpm db:validate` | `prisma validate` |

---

## 📄 Licencia

Proyecto privado - Pizca del Monte SAC. Todos los derechos reservados.

---

## 🤝 Contribuir

1. Fork del repositorio
2. Crear feature branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

### Convenciones

- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/)
- **Branches**: `feat/*`, `fix/*`, `chore/*`, `docs/*`
- **PRs**: Requerir review + CI passing

---

## 📞 Soporte

- **Email**: dev@pizcadelmonte.pe
- **Issues**: [GitHub Issues](https://github.com/tu-usuario/pizca-del-monte/issues)
- **Documentación**: `/docs` (próximamente)

---

**Hecho con ❤️ en Perú** 🇵🇪

*Pizca del Monte - El Sabor del Perú en tu Cocina*


### Administrador separado

El panel se ejecuta como servicio independiente y su entrada es `/login`. Configura `DATABASE_URL`, `ADMIN_AUTH_SECRET` (32 caracteres o más, distinto del secreto de la tienda) y `AUTH_URL` (URL HTTPS del panel) en ese servicio. `NEXT_PUBLIC_APP_URL` debe apuntar a la tienda para que los QR de recetas abran la URL pública correcta.

En una base de pruebas vacía con el esquema aplicado, puedes usar `pnpm db:seed` con `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` para crear la primera cuenta y cargar datos de muestra. El seed no modifica la contraseña ni los roles de una cuenta existente. Elimina las variables del seed cuando termines.

Desde la raíz del repositorio, el servicio se compila con `pnpm db:generate && pnpm build:admin` y se inicia con `pnpm --filter @pizca/admin start`.

#### Acceso de demostración

Inicia el servicio con `pnpm dev:admin` y abre `http://localhost:3001/login`.
Si el servicio del administrador no tiene `DATABASE_URL`, se activa el modo demo. Puedes desactivarlo con `ADMIN_DEMO_MODE=false`.
Usa **demo@pizcadelmonte.example** y **PizcaDemo-2026!**. Son credenciales públicas y solo abren el panel de demostración. El catálogo inicial proviene de los datos de demostración de la tienda y las modificaciones se guardan aparte, en el navegador.

Para alojar la demostración, usa HTTPS, omite `DATABASE_URL` en ese servicio y configura `ADMIN_DEMO_SECRET` con un valor aleatorio compartido por sus instancias. Configura `NEXT_PUBLIC_APP_URL` si quieres generar QR que apunten a tu tienda. Una receta creada solo en el navegador no queda publicada en la tienda. El seguimiento de envíos y los comprobantes del demo son de práctica.
