# Venta fiscal directa y paginación — 30 de octubre de 2026

## Corrección del flujo

- **Nueva venta abre directamente la emergente fiscal**, en la misma pantalla. Se eliminó la selección previa entre comprobante comercial y factura, y la píldora separada «Facturas».
- **Nueva cotización sigue siendo independiente.** Ambos botones quedan debajo del texto descriptivo, lado a lado también en teléfono.
- Los emitidos fiscales y los históricos comerciales se consultan en el listado compartido. Cada fuente conserva su API, identificador, permisos y snapshots. No se convierte un histórico a fiscal ni se permite editar/eliminar una factura como orden comercial.
- Detalle, impresión, anulación con motivo, libro de ventas y configuración/CAI siguen accesibles. Los registros sin autorización se identifican como **pendientes de CAI y sin validez fiscal**.
- El diálogo mantiene foco nativo, fondo inerte, cierre controlado durante operaciones y restauración del foco. El borrador fiscal se conserva al cerrarlo.
- Guardar tarifas actualiza el catálogo y las líneas del borrador fiscal; no recalcula documentos emitidos. El buscador de cabecera aplica el término al listado o a Precios sin abandonar Ventas.
- No se modificaron las APIs fiscales, el esquema ni las reglas de stock. La emisión continúa usando un solo POST fiscal, sin crear una orden comercial previa.

## Impresión: cambio y alcance real

Se retiraron las reservas de altura y las restricciones que agrupaban todo el cierre en un bloque indivisible. Encabezado y metadatos usan una disposición compatible con impresión; notas, autorización y firma pueden continuar en otra página. No se infiere un ticket a partir del ancho del iframe. Carta, media carta **vertical**, automático y tickets explícitos se conservan, sin nuevas pestañas ni cambios en la autenticación del visor.

**No se certifica todavía Safari/AirPrint físico.** La evidencia de dos páginas del iPhone es la aportada por el usuario, no una prueba ejecutada desde este entorno.

Resultados locales, a escala 100%:

| Comprobación | Resultado |
| --- | --- |
| A4 con una línea, matriz sintética | Una página en Chromium y Qt/WebKit probado |
| Documento fiscal auténtico local, A4 y Carta/Letter | Una página en ambos motores |
| Matriz de 108 PDF, incluidos documentos largos y 140 notas | Sin líneas/notas perdidas, firmas omitidas ni texto fuera de página; **6 fallos de paginado corto en Qt** |
| 8 PDF adicionales del documento fiscal auténtico | 7 de una página; **media carta en Qt ocupa 2 páginas** |

Los seis fallos sintéticos son factura Carta/Letter y los cuatro tipos de documento en media carta. Chromium genera una página en los casos cortos. Qt corresponde a **wkhtmltopdf 0.12.3**, no a Safari actual: estas diferencias no se ocultan ni se consideran una aprobación integral del paginado. No se redujo la escala para eludirlas. Falta confirmar el resultado real desde el iPhone/AirPrint.

## Verificación

- **634 tests / 35 archivos: aprobados.**
- ESLint completo: **0 errores, 58 advertencias**.
- Compilación local de Next: aprobada. La generación de Prisma utilizó `PRISMA_SCHEMA_ENGINE_BINARY=/bin/true` para evitar una descarga bloqueada; esto no se presenta como validación del esquema. CI ejecuta la validación y compilación normales sin ese override. El build local registró el aviso controlado de catálogo sin BD durante la generación estática, sin bloquear la compilación.
- **52 entradas del panel / 176 interacciones en píldoras**, más **40 interacciones** explícitas con las diez vistas de Inventario en cuatro tamaños: sin errores detectados. Son 216 interacciones, no 216 píldoras distintas.
- **18 casos de tamaño/tema**, de 320 a 1440 px: botones debajo del texto en una fila, diálogos centrados, sin desbordamiento y foco restaurado.
- Negocio verificado por tramos: emisión de L 274.50 con ISV 15/18/exento, descuento, tarifa, un POST y sin orden previa; stock y doble envío; cotización sin descuento de stock; alta eventual sin RTN inventado; anulación y reversión única; cinco perfiles de permisos.
- Comprobaciones adicionales: precio del borrador actualizado tras guardar las tres tarifas; factura ya emitida conserva L 115.00; cierre del visor y vuelta a Ventas sin recarga ni nueva emisión; búsqueda global en escritorio y teléfono.

La automatización de navegación presentó timeouts intermitentes en desarrollo; las rutas aisladas cargaron y respondieron 200. La revisión se completó por tramos con un navegador nuevo por entrada, sin atribuir a la aplicación una corrección de causa no demostrada.

## Aislamiento y limpieza

Todo se realizó en PostgreSQL local, sin acceso a producción ni despliegue manual. Se retiraron los fixtures y sus ocho logs: **las 17 tablas auditadas coinciden exactamente en conteo y SHA-256 con el baseline**. Se rotaron la contraseña interna de PostgreSQL y la firma de sesiones locales. Se conserva el acceso local solicitado `admin / 1234`. Capturas, PDF, tokens, herramientas y configuración privada permanecen fuera de Git.
