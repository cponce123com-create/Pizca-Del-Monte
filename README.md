# Pizca del Monte

Monorepo de la tienda y su administrador separado: pnpm 9.15.9, Next.js 15.5, React 18, Prisma 5 y PostgreSQL. El esquema Prisma contiene 92 modelos. El estado y los bloqueos comerciales están en [docs/estado-tienda.md](docs/estado-tienda.md).

## Estado actual

La tienda funciona en modo demostración, con 30 productos referenciales, recetas, búsqueda y carrito local al navegador. Los precios, imágenes y existencias no representan ofertas reales. El checkout responde 503 y el administrador permanece bloqueado por middleware. No se procesan pagos ni pedidos.

## Arranque de demostración

Usar Node.js 20–22 y pnpm 9.15.9. Copiar `.env.example` al entorno de la aplicación y conservar `DEMO_MODE=true`. No se necesita ni debe configurarse una base de datos para la demo.

```sh
pnpm install --frozen-lockfile
pnpm db:generate
pnpm dev:web
```

Abrir `http://localhost:3000`. El cliente Prisma se genera sin conectarse a una base. El catálogo demo se almacena en el código y el carrito en el navegador. `.env.full.example` es una referencia de nombres de variables para trabajo futuro; no activa integraciones.

## Comprobaciones

```sh
pnpm --filter @pizca/web lint
pnpm -r type-check
pnpm --filter @pizca/web exec jest --runInBand
pnpm --filter @pizca/admin exec jest --runInBand
pnpm audit --prod
pnpm --filter @pizca/web build
pnpm --filter @pizca/admin build
```

## Hoja de ruta

Antes de operar con datos reales se deben completar y probar el administrador, los permisos, migraciones y copias de respaldo; checkout, inventario concurrente, pagos, envíos, comprobantes y documentos legales. Las funciones de despliegue, webhooks, tareas programadas, caché distribuida, pruebas de navegador y observabilidad son trabajo pendiente, no integraciones listas. No ejecutar el seed sobre una base real sin revisarlo y respaldarla.

El seed de prueba usa el mismo catálogo demo. Sin `DATABASE_URL` informa cuántos productos hay y termina sin escribir datos. El seed se niega a ejecutarse en producción; la versión anterior se conserva como `seed.legacy.ts` únicamente como referencia y no debe ejecutarse.
