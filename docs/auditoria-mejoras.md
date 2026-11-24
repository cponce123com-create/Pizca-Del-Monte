# Auditoría y mejoras aplicadas

**Fecha:** 24 de noviembre de 2026

**Repositorio:** `cponce123com-create/Pizca-Del-Monte`, rama `main`

**Alcance:** revisión estática de tienda, autenticación, API de catálogo, panel, seed, dependencias, CI y paquetes del monorepo. Los cambios de esta sesión están solo en el clon local; no se publicaron ni se enviaron a GitHub.

## Cambios realizados

- **Redirección después del login:** se añadió `safeCallbackUrl` para permitir únicamente rutas del mismo origen y usar `/mi-cuenta` como fallback. Se aplica al destino recibido por query string para login con credenciales y proveedores sociales. Se añadieron pruebas para rutas válidas, URLs externas, rutas protocol-relative, barras invertidas, controles y esquemas no válidos.
- **Descripción de producto:** se eliminó la inserción de HTML crudo. La descripción ahora se presenta como texto, conservando saltos de línea; si se necesita formato HTML en el futuro, deberá sanitizarse con una lista permitida antes de renderizarse.
- **Inventario público:** se retiraron del endpoint de detalle los totales físicos, unidades reservadas y umbral interno de reposición. Se mantienen los campos de disponibilidad utilizados por la tienda.
- **Cuentas del seed:** se retiró la cuenta de prueba con contraseña conocida y la impresión de credenciales predeterminadas en los logs. El seed omite ahora cuentas autenticables; las cuentas de prueba deberán crearse con fixtures aislados por entorno. Esto no borra cuentas que ya se hubieran creado en una base existente.
- **Dependencias y documentación:** se fijó `pnpm@10.34.9`; los workflows y README usan esa versión. Los overrides globales de PostCSS y Zod se trasladaron a `pnpm-workspace.yaml`, donde pnpm los toma en cuenta. Las dependencias directas de Zod en paquetes compartidos se alinearon a `^4.6.7`. La lockfile resuelve PostCSS 8.5.33 y Zod 4.6.7. También se actualizaron en README las versiones documentadas de Next.js (15.5), Prisma (5.22) y Zod (v4), antes desfasadas. La documentación oficial ubica `overrides` en la raíz del workspace ([configuración](https://pnpm.io/settings/dependency-resolution); [referencia de package.json](https://pnpm.io/package_json)).
- **TypeScript y CI:** se añadieron `tsconfig.json` a `packages/config` y `packages/ui` para limitar el chequeo a sus propias fuentes. Con ello, `pnpm type-check` recursivo dejó de compilar archivos ajenos a esos paquetes. CI ejecuta ahora lint y chequeo de tipos en todos los workspaces.

## Verificación ejecutada

- `pnpm install --frozen-lockfile --prod=false --ignore-scripts`: correcto.
- `pnpm db:generate`: correcto; no se conectó a la base de datos.
- Tests: web, **24/24**; admin, **13/13**; total **37/37**.
- `pnpm lint`: correcto. Persisten advertencias de Next.js y dos advertencias de la tienda: una dependencia faltante de `toast` en un `useCallback` del checkout y el uso de `<img>` en la imagen demo.
- `pnpm type-check`: correcto en los seis workspaces con script de tipos.
- Builds de tienda y admin: correctos. El build web todavía avisa que falta `metadataBase` y que una ruta con Edge Runtime no se pre-renderiza estáticamente.
- `pnpm audit --prod --audit-level=high`: correcto; **cero alertas altas o críticas**, quedan **13 moderadas**.
- `git diff --check`: correcto. No se encontraron las credenciales de prueba retiradas en las fuentes actuales. El historial Git puede conservar versiones antiguas; si alguna credencial llegó a usarse fuera de pruebas locales, debe rotarse y revisarse el acceso asociado.

## Riesgos que permanecen abiertos

1. El middleware del servicio admin devuelve HTTP 503 en todas sus rutas. Se dejó así deliberadamente: el panel debe seguir bloqueado hasta completar pruebas reales de autenticación, autorización y endpoints; no se debe retirar el bloqueo como parte de este cambio.
2. El registro activa cuentas aunque `emailVerified` sea nulo, y login/registro no tienen limitación distribuida de intentos. Antes de aceptar cuentas o tráfico real, implementar verificación de correo y rate limiting compartido por IP y cuenta.
3. Debe verificarse en la base de datos de cada entorno si existe una cuenta de prueba creada por versiones anteriores del seed; este trabajo no tuvo acceso a la base ni la modificó. Desactivarla o rotar credenciales requiere una operación de mantenimiento separada. El historial Git no se reescribió; si una contraseña antigua fue real o reutilizada, hay que rotarla y evaluar si se requiere limpieza coordinada del historial y sus clones.
4. El repositorio no contiene migraciones Prisma versionadas. No se generó una migración inicial porque no se puede determinar sin revisar la base real si corresponde a un esquema nuevo o a una base existente.
5. El checkout, pagos, tarifas de envío e integraciones reales siguen sin habilitarse. Las pruebas se ejecutaron sin credenciales de proveedores ni base conectada; no constituyen aprobación para abrir ventas.
6. Continúan 13 vulnerabilidades moderadas de dependencias. Conviene revisar el detalle del audit y su impacto antes de hacer una actualización más amplia.

## Referencias

- [1] [Configuración oficial de overrides de pnpm](https://pnpm.io/settings/dependency-resolution)
- [2] [Referencia oficial de package.json de pnpm](https://pnpm.io/package_json)
