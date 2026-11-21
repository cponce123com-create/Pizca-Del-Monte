# Catálogo de demostración

Sin `DATABASE_URL`, la tienda muestra automáticamente 30 productos de muestra. También puede activarse con `DEMO_MODE=true`, incluso si hay una base configurada. En Render, esta variable debe configurarse en el servicio web; después se debe desplegar la versión que incluya estos cambios. El catálogo demo no escribe en la base de datos.

El catálogo, búsqueda, filtros, fichas y carrito de demostración funcionan sin PostgreSQL. El carrito se conserva solo en el navegador y los precios e imágenes son referenciales. No se realizan pagos ni pedidos reales. El registro de cuentas tampoco está disponible en modo demo.

Cuando el catálogo real y la base estén listos, configurar la URL real de PostgreSQL, establecer `DEMO_MODE=false` o quitar la variable y desplegar. Un error de conexión con una URL configurada no activa silenciosamente la demostración: debe revisarse la conexión. Esto evita mostrar datos de prueba durante una caída de producción.

El build todavía necesita instalar dependencias y generar el cliente Prisma (`pnpm install --frozen-lockfile && pnpm db:generate && pnpm --filter @pizca/web build`); no necesita ejecutar el seed ni conectarse a Neon para mostrar el catálogo demo.
