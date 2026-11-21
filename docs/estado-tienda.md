# Estado de la tienda y requisitos para abrir ventas

Revisión de la rama main del 21 de noviembre de 2026. La tienda no está lista para aceptar pedidos reales. El catálogo y el carrito existen, pero la existencia de una pantalla o modelo de datos no demuestra que la funcionalidad esté terminada.

## Bloqueos principales

- **Compra y pago:** el checkout anterior creaba pedidos antes de procesar el pago y Mercado Pago era una simulación. No existe una página de confirmación de pedido en la ruta a la que redirigía. Se ha bloqueado la API de checkout y se informa al cliente; la implementación anterior está en el historial de Git.
- **Precios y entrega:** el checkout y el carrito usaban tarifas, umbrales y plazos supuestos; el cálculo sumaba IGV sin una política de precios confirmada. El resumen del carrito ya no presenta esas cifras como reales.
- **Administración:** el servicio administrativo está deshabilitado por su propio middleware hasta contar con autenticación y autorización verificadas. No hay un panel operativo para gestionar catálogo y pedidos.
- **Información legal:** privacidad, términos, devoluciones y libro de reclamaciones están pendientes; el texto provisional no es un libro operativo. Se necesitan los datos reales del titular y revisión correspondiente.
- **Base de datos:** no hay directorio de migraciones Prisma versionadas. Se requiere una estrategia de migración y respaldo que respete la base existente antes de cambiar su estructura.
- **Integraciones:** requieren configuración y pruebas reales de proveedor: pagos y webhook verificado, envíos, correo, almacenamiento y comprobantes. No asumir que las variables de ejemplo implican una integración funcional.

## Antes de habilitar el checkout

1. Confirmar razón social o titular, RUC, canales de contacto, catálogo, precios, stock, cobertura y tarifas de entrega, y condiciones comerciales.
2. Implementar administración segura con roles, gestión de productos, inventario y pedidos, y pruebas de acceso.
3. Diseñar el pedido transaccional con precios recalculados en servidor, reserva y liberación de stock frente a concurrencia, cancelaciones y expiración; cupones y totales coherentes.
4. Integrar el proveedor de pagos con credenciales de prueba y producción separadas, validar firma y estado del webhook, idempotencia, conciliación y manejo de fallos; crear páginas de confirmación y seguimiento protegidas.
5. Implementar y probar tarifas y cobertura reales, correos, documentos y reclamaciones; completar textos legales con información verificada.
6. Probar el recorrido completo en móvil y escritorio con una base de prueba, incluidos pagos aprobados, rechazados, duplicados y cancelados, antes de habilitar la API.
