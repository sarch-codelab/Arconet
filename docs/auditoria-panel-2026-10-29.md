# Auditoría funcional del panel administrativo

Fecha: **29 de octubre de 2026**. Rama de trabajo: `arena/13a6ae27-arconet`.

## Entorno y alcance

- Next.js y PostgreSQL locales; base `arconet_local` en loopback, puerto 55432. No se usaron la base de producción ni SMTP externo.
- Navegador Chromium, incluyendo la vista embebida HTTPS sin cookies de terceros, sesión local y navegación adaptable.
- Tres tamaños: 1440 × 1000, 390 × 844 y 320 × 740. El último recorrido usó movimiento reducido.
- Los datos de escritura fueron fixtures QA identificables. Se eliminaron las entidades de prueba y se restauró la configuración original. La bitácora conserva las acciones de auditoría.

## Resultados finales

| Verificación | Resultado |
| --- | --- |
| Navegación global | 14 secciones en los 3 tamaños: 42 recorridos |
| Subpíldoras | 49 selecciones por tamaño: 147 selecciones en total |
| Navegación, filtros y cabecera | Sin excepciones JavaScript ni respuestas HTTP de error en la matriz final |
| CRUD y permisos | 35 comprobaciones registradas; dos navegadores sin excepciones JavaScript |
| Ventas, facturas e inventario | 39 comprobaciones registradas, incluidos saldos y concurrencia |
| `npm test` | **239/239**, 20 archivos |
| `npm run lint` | **0 errores**, 59 advertencias no bloqueantes de imágenes y patrones React existentes |
| `npm run build` | Aprobado; compilación optimizada y 23 páginas estáticas generadas |
| `git diff --check` | Aprobado |

Las respuestas 400, 403, 404 y 409 provocadas deliberadamente en las pruebas negativas se verificaron como resultados esperados, no como fallos de navegación.

## Cobertura por sección

| Sección | Recorrido y acciones comprobadas |
| --- | --- |
| Trabajadores | Píldoras/filtros, alta, edición, baja, acceso de solo lectura y trabajador asignado a una sucursal recién creada |
| Roles | Listado, alta, edición de permisos, baja y navegación autorizada por rol |
| Productos | Filtros, alta, edición, baja/archivo con historial y relación con categoría e inventario |
| Categorías | Filtros, alta, edición y baja; protección de categorías con productos vigentes |
| Sucursales | Búsqueda, limpiar filtro, alta, edición, baja y uso en trabajador/perfil |
| Clientes | Búsqueda, limpiar filtro, alta, edición, baja y protección 409 cuando existe historial fiscal |
| Ventas | Todas las subpíldoras, cotización y venta reales, cliente y líneas, cálculo, edición, conversión, anulación comercial y eliminación |
| Facturación, dentro de Ventas | Documentos, Nueva factura, Libro y Configuración; emisión local sin CAI, detalle, anulación, descargas CSV/Excel y permisos fiscales independientes |
| Inventario | Stock, Kardex, Movimientos, Bodegas y Alertas; bodega y movimiento reales, saldo por bodega y primer ingreso de un SKU sin stock con un rol exclusivo de inventario |
| Órdenes internas | Órdenes/áreas, área y responsables, creación, comentario, revisión, aprobación, trabajo, finalización y eliminación de la fixture |
| Monitoreo | Todas sus subpíldoras, carga de datos y estado vacío explícito de Alertas |
| Logs | Filtros de categoría, paginación siguiente/anterior y controles Pausar/Reanudar |
| Resumen | Subpíldoras y agregados separados de cotizaciones, ventas comerciales y documentos fiscales, excluyendo los estados cancelados/rechazados del neto de ventas |
| Mi perfil | Navegación desde la cabecera y guardado del perfil propio con un rol sin privilegios administrativos |
| Ajustes | Abrir no cambia el tema; guardar lo aplica y persiste en la base y en el navegador; restauración posterior |

También se comprobaron búsqueda global, notificaciones, Escape, menú de cuenta, confirmaciones con teclado/foco/bloqueo de scroll y saltos de navegación móvil entre secciones distantes.

## Defectos corregidos durante la revisión

- La query de sección prevalece sobre hashes antiguos: Ventas ya no vuelve a Trabajadores. Los enlaces anteriores siguen normalizándose.
- Las subpíldoras fiscales no se reinician al seleccionar Nueva factura, Libro o Configuración.
- Permisos de lectura, escritura y eliminación independientes; acciones deshabilitadas/ocultas y rechazo de escrituras en las APIs. Facturación y ventas comerciales no se conceden acceso mutuamente.
- Sucursales dinámicas en trabajadores y perfil, sin depender de un catálogo fijo.
- Categorías vacías eliminables aunque existan productos archivados para conservar historial.
- Guardado de tema sin errores y sin imponer un cambio al abrir Ajustes.
- Navegación móvil con puntos de scroll-snap en todas las píldoras, incluido el perfil.
- Inventario puede consultar el catálogo de apoyo sin conceder acceso al módulo Productos. No depende de que el SKU tenga previamente una fila de existencias.
- Ventas: sincronización por tipo/estado anterior y final, incluyendo cotización ↔ venta y creación inicialmente cancelada o rechazada.
- Reversos por saldo **neto pendiente**, agrupados por producto y bodega: editar repetidamente y luego cancelar/borrar no pierde stock ni devuelve dos veces las mismas unidades.
- Bloqueos transaccionales de orden/referencia y rollback conjunto de documento, existencias y kardex. Se probaron ediciones simultáneas y edición/borrado concurrentes contra PostgreSQL real.
- Cantidades de productos de catálogo enteras, conforme al esquema actual de stock, en lugar de redondear fracciones silenciosamente. Los conceptos libres sin producto conservan cantidades decimales.
- Monto calculado en el servidor desde las líneas; protección de envío doble del formulario y etiquetas de eliminación correspondientes a venta/cotización.

### Comprobación de saldos

Un producto QA comenzó con 20 unidades. La venta y sus sucesivas ediciones dieron saldos 19, 18 y 17; convertirla en cotización devolvió 20; volver a venta descontó hasta 17; cancelar devolvió 20; reactivar volvió a 17; editar a 4 unidades dejó 16; eliminar devolvió exactamente 20.

En cada paso se contrastaron **catálogo, suma de existencias por bodega y kardex neto**. También se verificaron rechazo de fracciones, rollback por stock insuficiente, cuatro pares de ediciones concurrentes, edición/borrado concurrentes, venta creada cancelada, servicio fraccionario y factura local/anulación/reintento de anulación sin devolución duplicada.

## Impresión y regresiones conservadas

- Visor en la misma página, sin `window.open` ni dependencia de permisos de ventanas emergentes.
- Formatos automático, carta, media hoja horizontal, media carta vertical y tickets de 80/58 mm; preferencia persistida, logo y documentos en blanco y negro.
- Verificación digital de 18 PDF, contenido íntegro y paginación; comprobaciones de copia, descarga, impresión, sesión y tamaño móvil.
- Home visible, con animaciones presentes y sin desbordamiento horizontal tanto con movimiento reducido como normal.

## Límites de la validación

- No se emitieron documentos con un rango CAI ficticio ni se modificó configuración fiscal de producción.
- La verificación de impresión fue digital. No sustituye una prueba física del modelo de impresora, controlador y papel del usuario.
- Persisten 59 advertencias de lint no bloqueantes; no se presentan como una ejecución sin avisos.
- Este informe describe los recorridos y casos efectivamente ejecutados, no una garantía de todas las combinaciones posibles ni una prueba de carga de producción.
- Los reportes del navegador, tokens de sesión, certificados de prueba y datos PostgreSQL se mantienen en `.local/`, fuera de Git. `KEY` (sin distinguir mayúsculas) y `*.key` también están excluidos; no se encontró un archivo llamado `KEY` en el árbol inspeccionado.
