# Auditoría local del rol Ventas — 30 de octubre de 2026

## Alcance

Pruebas en PostgreSQL local real (`arconet_local`), con un **usuario y trabajador nuevos asociados al rol estándar `ventas`**, no un administrador disfrazado de vendedor. Se reprodujo primero el comportamiento de la captura: sólo «Nueva cotización» y logo azul bajo tema oscuro.

**Estas pruebas autenticadas se realizaron únicamente en local.** No se inició sesión con la cuenta real ni se ejecutaron operaciones comerciales en producción. Las consultas públicas de disponibilidad realizadas anteriormente no equivalen a este recorrido de trabajador. No se certifican el despliegue ni AirPrint físico, y no se realizó despliegue manual.

## Fallos reproducidos y corregidos

| Hallazgo | Corrección |
| --- | --- |
| El rol estándar podía cotizar, pero no tenía permisos fiscales; desaparecía «Nueva venta». | Permiso operativo **`facturacion:emit` + `facturacion:read`** en el rol Ventas. Seed y migración de datos para el rol existente activo que ya podía crear órdenes. No se concede emisión a todos los que tengan `ordenes:write`. |
| Dar escritura fiscal completa para resolver lo anterior habría concedido CAI/anulaciones innecesariamente. | Emisión operativa separada de `facturacion:write`. Sólo crea facturas directas: no cambia CAI, no anula, no crea notas de crédito/débito ni vincula históricos comerciales. La gestión fiscal completa conserva su permiso explícito. |
| Logo azul sobre fondo oscuro. | La marca original se muestra blanca sólo con tema oscuro. En claro conserva sus colores. No se reemplazó la imagen ni se cambió el logo de impresión. |
| El catálogo general y su lectura individual devolvían costo de compra a Ventas. | Se omite `costo` para quienes no tengan lectura de compras o mantenimiento de productos. El GET del catálogo sigue respondiendo a las sesiones autenticadas: no se endureció su permiso de acceso ni se retiraron precios/tarifas/stock. |
| Controles de editar/eliminar aparecían deshabilitados para roles sin el permiso correspondiente. | Se oculta Eliminar en las listas revisadas y Editar sin autorización en ventas/productos. Las APIs conservan sus comprobaciones independientes. |
| La venta descontaba bien en la base, pero al volver al catálogo sin recargar aparecía el saldo anterior. | Refresco autoritativo del catálogo tras emisión/anulación. Un fallo de refresco se informa como tal: no se presenta como fallo de la operación ya guardada ni invita a repetirla. |
| Por la noche en Honduras, la fecha inicial de cotización tomaba el día siguiente por UTC. | Día local en el borrador y tratamiento de fechas de calendario sin corrimiento en la lista/impresión. Los timestamps históricos con hora distinta de medianoche se conservan como instantes. No se modificaron fechas guardadas en la base. |

Los permisos predeterminados se comparten entre el seed y los tests mediante `lib/roles-defaults.js`: la regresión se prueba con el rol real, no sólo con permisos de administrador o roles fiscales artificiales.

## Pruebas ejecutadas

- **685 tests / 39 archivos: aprobados.**
- ESLint completo: **0 errores / 58 advertencias**.
- Compilación Next aprobada. Sólo para generar Prisma localmente se usó `PRISMA_SCHEMA_ENGINE_BINARY=/bin/true` para evitar la descarga bloqueada de su herramienta nativa; no se presenta ese override como validación del esquema. La compilación sin BD activa produjo el aviso controlado de catálogo, sin bloquear el build.
- **20 entradas / 68 interacciones en píldoras** del usuario Ventas: sus cinco secciones (Clientes, Ventas, Inventario/catálogo, Resumen y Mi perfil) en cuatro tamaños. Sin errores ni desbordamiento detectados. Son interacciones, no 68 píldoras distintas.
- **18 combinaciones de tamaño/tema**, de 320 a 1440 px: logo blanco sólo en oscuro; botones debajo del texto y en una fila; emergentes centradas, inputs fiscales móviles de al menos 16 px y foco restaurado en Nueva venta.
- **11 checks de negocio por tramos**, más comprobaciones de roles, perfil, migración y fecha.

### Recorrido de negocio con el trabajador

1. Login real desde el formulario, búsqueda incremental de homónimos y selección por identificación guardada.
2. Venta local de **L 286.00** con tarifa de descuento, producto, servicios e ISV 15/18/exento. Un POST fiscal, cero órdenes comerciales previas y un movimiento de stock (20 → 18). Doble envío y cierre durante la petición bloqueados.
3. Servidor rechaza CAI, anulación, notas fiscales y cambio de tarifas; los controles correspondientes no se ofrecen al operador.
4. Detalle y visor de impresión autenticados, sin pestañas nuevas, recarga ni tokens dentro del HTML.
5. Cotización independiente de **L 80.00** con tarifa mayorista, sin nuevo documento fiscal ni movimiento de inventario.
6. Alta eventual sin identificación inventada, conservando el producto y total del borrador.
7. Stock insuficiente: rollback completo, sin factura adicional ni movimiento; borrador conservado.
8. Dos ventas adicionales locales de **L 115.00** permitieron reproducir y comprobar la corrección del stock visible en el catálogo (antes desactualizado, después coincidente sin recargar).

También se verificaron lectura, cotización sin permiso fiscal, técnico e inactivo: no reciben emisión implícita; y el administrador pudo revisar el nuevo privilegio en la matriz de Roles sin guardar cambios. El tema personal persistió al recargar y no afectó a otra cuenta.

## Qué falta o conviene simplificar

- **Resumen comercial:** actualmente distingue «Ventas comerciales» y no agrega allí las nuevas facturas fiscales. Para el trabajador conviene un resumen de Ventas que incluya lo fiscal, sin duplicar históricos vinculados y distinguiendo facturado/cobrado. No se cambió silenciosamente esa métrica en esta auditoría.
- **Tarjetas sin permiso en Resumen:** aparecen tarjetas de personal sin datos para Ventas. Conviene una composición específica del rol en lugar de tarjetas que sólo dicen «Sin permiso de consulta».
- **Dependencias de desarrollo:** `npm audit` reportó 18 avisos (16 moderados y 2 críticos; Vitest/tinypool). `npm audit --omit=dev` reportó **0**. La actualización de Vitest propuesta es mayor; no se ejecutó `audit fix --force` ni se cambió la cadena de dependencias a ciegas.
- La disponibilidad y el comportamiento de la **cuenta real de producción**, su rol exacto, CAI, correo y dispositivos físicos siguen pendientes de una verificación con acceso autorizado. No se presentan las pruebas locales como sustituto de ella.

## Limpieza y publicación

Se retiraron las tres facturas, cotización, clientes, producto, stock/movimientos, cuatro cuentas, trabajador y roles auxiliares de QA, junto con 18 logs de esas cuentas. **Las 19 tablas auditadas coinciden exactamente en conteo y SHA-256 con el baseline posterior a la migración intencional de permisos y anterior a los fixtures.**

La migración de permisos es idempotente y se comprobó que no amplía roles de sólo lectura, inactivos, técnicos ni personalizados. El cambio intencional del rol estándar no se confunde con datos de prueba.

Capturas, tokens, configuración y herramientas permanecen fuera de Git. Antes de llevar estas correcciones a producción debe quedar claro que publicar en `main` activa el poller y la migración habilita emisión operativa para el rol estándar Ventas que cumpla sus condiciones. La auditoría local, por sí sola, no implica que ya estén desplegadas.
