# Administrador separado: trabajo en preparación

El administrador permanece bloqueado por middleware (HTTP 503). El código añade una pantalla de acceso, una sesión separada y vistas de consulta de resumen y productos. No habilita la edición ni las ventas.

Antes de retirar el bloqueo se requiere: probar autenticación y autorización con PostgreSQL real; probar revocación de roles, expiración, acceso directo a rutas y cierre de sesión; implementar protección contra ataques por IP con almacenamiento compartido, comprobaciones de seguridad y despliegue HTTPS; definir la gestión segura de cuentas y su recuperación. Las cuentas con 2FA activado son rechazadas hasta que se implemente su verificación.

El servicio separado necesitará `DATABASE_URL`, su URL de autenticación correspondiente y `ADMIN_AUTH_SECRET` aleatorio de al menos 32 caracteres, diferente del secreto de la tienda. Nunca se debe publicar el secreto ni enviarlo al cliente.

El seed solo crea una cuenta nueva con privilegios si se configuran expresamente `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` (al menos 16 caracteres). Si la cuenta ya existe, no cambia su contraseña ni le asigna roles. No ejecutar el seed completo sobre datos de producción sin revisar previamente sus efectos; no utilizarlo como mecanismo de promoción de usuarios existentes.
