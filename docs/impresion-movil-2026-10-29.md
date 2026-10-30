# Corrección de la vista previa de impresión en móvil

Fecha: **29 de octubre de 2026**. Rama: `arena/56d6bc23-arconet`.

## Síntoma y alcance del diagnóstico

La captura muestra el visor abierto con «Guardar copia HTML» y «Cerrar», pero el área del documento está en blanco. El visor anterior navegaba a una URL `blob:` dentro del iframe sin comprobar que se hubiera mostrado contenido ni ofrecer un estado de error del iframe.

Se reprodujo esa misma condición visual con **el componente y CSS anteriores reales**, bajo una política de navegador que bloquea la navegación a Blob: encabezado y descarga visibles, documento vacío. La corrección funciona bajo esa misma condición. Esta es una reproducción controlada del mecanismo de fallo, **no demuestra qué restricción exacta tuvo el iPhone de la captura**; no se dispone de su consola ni de sus respuestas HTTP.

## Corrección

- El HTML ya descargado mediante la API autenticada se muestra directamente con **`iframe.srcdoc`**. No necesita navegar al Blob para verse. La URL Blob se conserva únicamente para guardar una copia; los PDF binarios conservan su visor nativo.
- El área del iframe tiene un contenedor con dimensiones explícitas y desplazamiento interno. Se evita depender del dimensionamiento de un elemento reemplazado con `flex-basis: 0` en móvil.
- El visor muestra «Cargando vista previa…» hasta comprobar que existe contenido de `main.sheet`. Ignora el `about:blank` inicial que algunos motores notifican antes del documento.
- Si el iframe falla, el HTML no es imprimible o no se notifica su carga en 12 segundos, se muestra un aviso con **Reintentar vista previa**, en lugar de dejar un área blanca indefinidamente.
- Una respuesta HTML vacía se rechaza y cierra el visor de preparación. Cancelar durante la petición o durante la lectura del HTML no vuelve a abrirlo ni conserva una URL tardía.
- Guardar copia sigue conservando el papel seleccionado. Si el iframe no llegó a cargar, descarga el HTML original, no una copia de `about:blank`.
- La preferencia de papel se notifica al **origen real del padre**: `location.origin` del documento `about:srcdoc` puede ser `"null"`. No se usa un destino `*`; el receptor sigue comprobando origen, ventana emisora y clave de formato.

Se mantienen el logo, blanco y negro, datos comerciales/fiscales, carta, media carta **vertical**, media hoja horizontal opcional, automático y tickets de 58/80 mm. No se abre `window.open` ni se sustituye el visor por una pestaña nueva.

## Seguridad y datos

No se modifican permisos, rutas autenticadas, filtros de pertenencia del cliente, CSP ni `X-Frame-Options`. Producción conserva `DENY` y `frame-ancestors 'none'`. El HTML privado vive solo en memoria del visor, no en storage ni en parámetros URL; el snapshot SSR continúa siendo `null`. Cerrar cancela la carga y libera la URL de descarga.

No hay cambios de dependencias, esquema ni migraciones. La validación fue exclusivamente local, sin SMTP externo, operaciones directas sobre la BD productiva ni despliegue manual.

## Validación

| Comprobación | Resultado |
| --- | --- |
| Pruebas automatizadas | **341/341**, **26 archivos**; 19 regresiones nuevas |
| ESLint | **0 errores**, 59 advertencias existentes |
| Prisma validate | Esquema válido |
| Build optimizado | Aprobado, **23 páginas estáticas** |
| `git diff --check` | Aprobado |
| Panel completo | **192 recorridos** a 1440/390/320 px: 42 visitas a secciones y 150 selecciones de píldoras; sin excepciones JS ni respuestas API inesperadas |
| Visor con componente real y política de producción, incluso bloqueando Blob | **320/390/768/1440 px**; documento, logo, seis formatos y área de contenido visibles; sin desbordamiento horizontal ni pestañas nuevas |
| Impresión en esa matriz | 24 acciones verificadas: se invoca `print` del iframe, no el de la aplicación |
| Copia HTML | Conserva logo, datos y formato seleccionado; se comprobó el contenido del archivo descargado |
| Cierre y reapertura | Escape desde el iframe, botón Cerrar, restauración del foco, liberación de URL y preferencia recordada |
| Fallos simulados | HTML vacío, 403, HTML sin documento imprimible, ausencia de evento `load`, timeout y recuperación con Reintentar |
| Aplicación Next y API reales | Cotización y venta comercial a 390 px, seis formatos cada una, copia y cierre; portal de cliente a 320 px con documento propio |
| App embebida local | Iframe entre orígenes reales: tras quitar cookies después del login, documento descargado por cabecera local autenticada, `srcdoc` anidado y selección/cierre correctos; sin tokens en URL |
| Tras build y reinicio | Cotización real visible a 390 px con logo, datos y selector de papel; sin JS, desbordamientos ni pestañas adicionales |

El build usó una URL de validación sin BD accesible; catálogo/sitemap registraron sus fallbacks existentes de base no disponible, sin impedir la compilación. Los flujos funcionales sí usaron PostgreSQL local.

Las regresiones nuevas cubren el HTML en memoria y su ausencia en SSR, UTF-8, respuesta vacía, cancelación durante la lectura, montaje real del componente con `srcdoc` y PDF, y ejecución del script de impresión de los seis formatos con origen heredado. No se omitieron pruebas ni se relajaron controles de CI.

### Límites de la prueba

Las comprobaciones de navegador utilizaron **Chromium**, no un iPhone físico ni el motor WebKit. Los anchos móviles no equivalen a probar Safari. Se verificó la invocación de impresión y el HTML generado, no el diálogo nativo de iOS ni la salida física de cada impresora. La factura fiscal se comprobó con la plantilla y datos de fixture, sin emitir nuevas facturas fiscales en la base.

### Limpieza

El cliente semilla solo tenía una cotización pendiente, que correctamente no aparece en Documentos. Se creó una cotización QA aprobada independiente para probar el enlace real de ese portal y se eliminó al terminar. Se verificaron **16 productos y 3 órdenes semilla intactos**, con existencias sin cambios; la bitácora se conserva. El smoke posterior al reinicio fue de solo lectura y no recreó esa fixture.

Capturas, configuración de navegador, sesiones y registros detallados permanecen privados en `.local/`, fuera de Git.
