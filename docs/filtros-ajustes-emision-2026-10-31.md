# Listados, Ajustes empresariales y feedback de emisión — 31/10/2026

## Cambios solicitados

### Listados

Trabajadores, Roles, Categorías, Sucursales y Clientes conservan **una única píldora de ubicación**, sin accesos adicionales de sucursal, estado, gerencia, roles o uso. Es una etiqueta, no un botón de filtro que pueda navegar de forma inesperada.

- Trabajadores mantiene selección de sucursal, rol y estado. Las opciones de rol también se obtienen de los trabajadores visibles, sin necesitar gestión de Roles.
- Roles añade selección de estado; Categorías selección de estado y uso (con/sin productos); Sucursales añade selección de estado; Clientes conserva su selección de estados.
- Búsquedas, filtros combinados, limpiar, datos y permisos de las tablas se conservan. No se codificaron los nombres de las sucursales de la captura.

### Ajustes: único lugar de configuración empresarial

En `?section=ajustes` quedan los datos generales/comerciales, contacto, moneda general, tema público y la sección de **datos fiscales y CAI**:

- RTN real del emisor, razón social y dirección fiscal.
- CAI, serie, inicio/fin de rango, próximo correlativo y fecha límite de emisión.
- Estado de autorización y confirmación explícita antes de guardar.

La edición fiscal se retiró de Ventas, incluida su pestaña/botón de configuración. Las referencias antiguas explican que se trasladó a Ajustes. **`facturacion:write` ya no concede escritura de CAI:** configurar requiere `ajustes:read` + `ajustes:write`. Ajustes puede administrarse sin conceder permiso de emitir facturas.

La lectura fiscal ordinaria sólo recibe un diagnóstico de emisión; no descarga CAI, serie, RTN, contador o revisión editables. Las credenciales SMTP, base de datos, claves y sesiones del servidor **no se muestran ni se guardan aquí**. La apariencia personal continúa en Mi perfil. La moneda general no convierte precios ni cambia importes guardados; la emisión fiscal actual conserva HNL.

## Protecciones de configuración y numeración

- Guardado fiscal atómico y auditado. Usa el mismo bloqueo transaccional `fiscal-correlativo` que la emisión.
- Revisión optimista: si otra emisión/configuración avanzó el contador desde la carga del formulario, responde **409** y pide actualizar, sin pisar el siguiente número.
- Validación de serie, rango, contador entero, fecha y datos obligatorios del emisor. No se generan CAI, RTN ni autorizaciones: deben transcribirse de los documentos reales. **No hay verificación en línea con SAR**; la revisión externa de la autorización corresponde a la empresa.
- No se reduce el contador ni se reutilizan números ya emitidos, incluidas facturas anuladas. No se cambia a un CAI cuyo rango reutilice números ni se borra una autorización ya usada.
- La vigencia se evalúa por día de **Honduras**, no por el cambio de fecha UTC. Rango agotado o autorización incompleta/vencida impiden numerar y explican el motivo.
- Configuraciones antiguas que sólo tengan CAI/serie/contador deben completarse con rango, fecha límite y datos del emisor en Ajustes antes de continuar con emisión numerada.

Se conserva la política previa de registro cuando **no hay ninguna autorización configurada**: el botón y los avisos dicen expresamente «Guardar venta pendiente de CAI», sin número ni validez fiscal. No se presenta ese registro como una factura autorizada ni se renumera posteriormente al configurar el CAI.

## Factura: información visible en la emergente original

El formulario no depende de un botón deshabilitado sin explicación ni de notificaciones detrás de la capa nativa del modal:

1. Lista qué falta: selección real de cliente, guardar el alta eventual, producto/concepto, descripción, cantidad, precio, descuento, impuesto, carga de datos y autorización.
2. Al pulsar, valida dentro del formulario y enfoca un aviso accesible. Conserva cliente, líneas y cantidades; no envía si hay problemas.
3. Mientras procesa muestra un estado visible, impide doble envío y bloquea el cierre. La petición tiene espera acotada a 30 segundos, sin reintento automático.
4. Un fallo de carga permite reconsultar sin borrar el borrador. Stock insuficiente o errores del servidor aparecen en el propio diálogo.
5. El guardado confirmado deja un aviso persistente en Ventas con número/estado, total y acceso al documento, aunque se cierre la emergente.
6. Ir a Ajustes y volver conserva el borrador **en memoria de esa instancia autenticada**, sin URL ni almacenamiento persistente de datos o sesiones.

## Reintentos sin duplicación

El editor envía una referencia UUID por borrador. El servidor valida permisos, bloquea esa referencia y conserva una huella de la intención:

- La misma referencia/carga devuelve el documento ya guardado, sin otro número, movimiento de stock o log de nueva emisión.
- Si los datos cambiaron después de un guardado cuya respuesta se perdió, responde conflicto y permite consultar el documento existente, no crea otra venta.
- Otro actor no recupera el documento por copiar la referencia. La referencia **no es una credencial**.
- El esquema incorpora una clave nullable única y hash de carga. Los clientes antiguos sin referencia mantienen su contrato validado anterior; la protección de reintento descrita corresponde a las solicitudes que conservan esa referencia.
- Descartar/recargar y rehacer un borrador puede iniciar otra operación: ante una respuesta incierta debe revisarse el listado antes de preparar una venta nueva.

## Datos reflejados y documentos anteriores

Las nuevas emisiones capturan una instantánea de emisor, contacto y autorización/rango. Cambiar después Ajustes **no altera esos datos ni la numeración** de esas facturas. La huella de las nuevas facturas incluye correlativo e instantánea. La migración añade campos nullable; no rellena históricos con identidad o autorización inventada. Los documentos anteriores sin esa instantánea conservan el tratamiento compatible previo y sus avisos de autorización faltante.

## Validación local

- **872 tests / 51 archivos PASS**, incluyendo regresiones previas, permisos, filtros, estados, numeración, revisiones, hash, idempotencia e impresión con instantánea.
- Lint: **0 errores / 58 advertencias** existentes.
- Compilación Next: **PASS**. Sólo para generar Prisma localmente se usó `PRISMA_SCHEMA_ENGINE_BINARY=/bin/true` para evitar su descarga nativa bloqueada; no se presenta como validación de esquema. El catálogo produjo el aviso controlado de base detenida durante prerender, sin bloquear el build.
- **90 casos de pantalla/tema** (320–1440 px): cinco listados, Ajustes lectura/escritura y factura; sin overflow, factura centrada, campos móviles activos de al menos 16 px.
- Smoke de panel: **36 entradas / 112 interacciones**, Administración y Ventas en móvil/escritorio, sin errores JS observados.
- **12 checks integrales API**, **8 UI de filtros/Ajustes**, **6 UI de factura** y un caso adicional de autorización vencida: exclusión de permisos, guardado confirmado, revisión concurrente, bloqueo de rango, rollback de stock, respuesta perdida y recuperación, mensajes dentro del diálogo, persistencia al visitar Ajustes.
- Se enviaron realmente solicitudes concurrentes de la misma referencia y se simuló perder la respuesta **después** del commit; ambos casos dejaron un solo documento y movimiento por operación.
- Se emitieron exclusivamente documentos sintéticos en el clúster local, con marcas QA y sin autorización real; no se utilizó ni copió identidad/CAI de las capturas.
- Limpieza: **26 tablas idénticas por conteo + SHA-256 al baseline posterior a la migración y anterior a fixtures**; ocho documentos y 22 logs propios retirados; datos empresariales originales restaurados, sin modificar datos ajenos.

No hubo login, emisión ni despliegue manual en producción. La publicación en `main` utiliza el poller existente; su aplicación efectiva en el servidor debe verificarse independientemente. Pruebas locales Chromium no certifican Safari/AirPrint físico. Capturas, sesiones, configuraciones y tooling permanecen fuera de Git.
