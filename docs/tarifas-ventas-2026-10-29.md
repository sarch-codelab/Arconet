# Tres tarifas de venta por producto

Fecha: **29 de octubre de 2026**. Rama: `arena/41fe7139-arconet`.

## Funcionamiento

- **Ventas → Precios** permite buscar por nombre/SKU, consultar las tres tarifas, editarlas y consultar su historial.
- **Valor 1 · Normal** es el precio original de venta (`Producto.precio`), **no el costo**. Se conserva el valor existente.
- **Valor 2 · Descuento** y **Valor 3 · Mayorista** son opcionales: inicialmente quedan sin configurar, sin inventar importes ni cantidades mínimas. Deben ser positivos, tener como máximo dos decimales y no superar el Valor 1. El mínimo histórico de L 1 para el precio normal se mantiene.
- Cotizaciones, ventas comerciales y nuevas facturas permiten escoger el nivel por línea. Un nivel sin configurar no se puede seleccionar.
- Para productos del catálogo, el servidor determina el importe: no confía en el precio o total enviado por el navegador. Los conceptos libres conservan su precio manual.
- Editar una cotización conserva el precio acordado si se mantiene el mismo producto y nivel. **Actualizar tarifa** aplica expresamente el importe vigente; también se consulta la tarifa al cambiar de producto o nivel. Cambiar el catálogo por sí solo no reescribe cotizaciones ni documentos fiscales ya emitidos.
- Productos también muestra los tres campos y respeta el permiso de precios. Ventas conserva Cotizaciones, Facturas y sus demás funciones; no se reduce a una sola pestaña.

## Seguridad y compatibilidad

- Permisos independientes **`precios:read`** y **`precios:write`**. Un gestor de precios no necesita obtener escritura de productos ni acceso a costos/existencias por la API de precios.
- El servidor comprueba permisos en cada petición. También protege las rutas de creación/edición de productos para que no sirvan de alternativa para modificar tarifas sin autorización.
- La migración mantiene capacidades de los roles existentes: concede lectura a roles de catálogo/comercial indicados en el SQL y escritura a quienes ya podían editar productos. Después se pueden separar mediante Roles; no se conceden permisos de escritura de precios por el mero hecho de facturar.
- Los descuentos fiscales adicionales en líneas de catálogo requieren `precios:write`. El operador fiscal sin ese permiso puede escoger tarifas aprobadas, no modificar su importe ni añadir descuentos a esas líneas.
- Guardado de precios con bloqueo de fila, control de versión de los formularios y auditoría **en la misma transacción**. Un conflicto devuelve 409 en lugar de pisar silenciosamente el cambio del otro formulario.
- La bitácora registra actor, fecha y valores anteriores/nuevos; el modal consulta las últimas 25 entradas de ese producto. Se reutiliza la bitácora existente: no se cambia su política de conservación ni se promete inmutabilidad indefinida.
- Los documentos guardan nivel de tarifa, precio base y precio acordado. La compatibilidad de documentos fiscales anteriores conserva su huella histórica.
- La API de precios usa `private, no-store` y no entrega costo ni stock. Se añadió regresión que comprueba que el catálogo público mantiene su whitelist de precio normal, sin nuevas tarifas internas ni actores.
- Órdenes exige `ordenes:read` para personal; el portal continúa limitado a las órdenes del cliente autenticado. El listado devuelve los identificadores y snapshots necesarios para no recalcular precios históricos al editar.
- Se mantiene el catálogo de apoyo de inventario con **`inventario:read` O `productos:read`**, incluyendo productos sin `ProductoStock`; no se endureció arbitrariamente ese GET. Productos solo consulta bodegas cuando corresponde al permiso de inventario.

## Migración y despliegue

`prisma/migrations/20261029140000_tres_tarifas/migration.sql` añade las tarifas opcionales, metadatos, snapshots y una restricción CHECK. No cambia los precios normales ni reconstruye importes de documentos anteriores.

La migración se aplicó a PostgreSQL local. También se reconstruyó transaccionalmente sobre registros existentes y se comprobó la preservación de datos antes de hacer rollback de esa prueba. Una escritura SQL que intenta dejar mayorista por encima del normal fue rechazada con **23514**.

`deploy.ps1` ahora aborta si falla `prisma migrate deploy`, en lugar de continuar con un build que depende de columnas ausentes. Se verificó mediante regresión estática; **no se ejecutó PowerShell en Windows ni un despliegue productivo**.

La publicación del código se realiza por la rama de trabajo y PR a `main`. El despliegue continúa a cargo del mecanismo habitual del repositorio; esta validación no intervino la base productiva ni disparó un despliegue manual.

## Inicio y presentación

Se retiraron únicamente «Infraestructura para estar más cerca de ti» y el texto solicitado sobre soluciones en telecomunicaciones/fibra/CATV. Se conservaron imágenes, animación, navegación y un H1 accesible con el nombre Arconet.

Los modales de precios/cotizaciones utilizan un overlay centrado, con límites de altura y desplazamiento interno. No se alteró el sistema de impresión sin ventanas nuevas ni se sustituyeron carta y media carta vertical por otros formatos.

## Validación final

Entorno aislado: Next.js, PostgreSQL 17 en loopback y Chromium. Sin SMTP externo ni conexiones a datos de producción.

| Comprobación | Resultado |
| --- | --- |
| Pruebas automatizadas | **322/322**, 24 archivos |
| ESLint | **0 errores**, 59 advertencias existentes |
| Prisma validate | Esquema válido |
| Build de producción | Aprobado, **23 páginas estáticas** |
| Diferencias y archivos privados | `git diff --check` aprobado; sesiones, claves y fixtures fuera de Git |
| Panel completo a 1440, 390 y 320 px | **14 secciones × 3 = 42 visitas** |
| Píldoras, incluidas las anidadas | **50 × 3 = 150 selecciones** |
| Matriz global | **192 recorridos**, sin excepciones JS ni respuestas API inesperadas |
| Nueva cotización / Nueva venta | **6 modales**, centrados y sin desbordamiento a 320/390/768 px |
| Inicio | 390/1440 px, movimiento normal/reducido; texto retirado, animación visible, H1 y ancho correctos |
| Comprobación tras build y reinicio | Precios a 390 px operativo; 16 productos y 3 órdenes semilla intactos, sin JS/API inesperadas |
| Documentos HTTP tras reinicio | Los **6 formatos válidos** (`auto`, `carta`, `media-hoja`, `media-carta`, `ticket-80`, `ticket-58`), con formato solicitado, logo embebido y sin `window.open` |

La primera ejecución de CI detectó que el nuevo test de helpers fiscales importaba indirectamente un cliente Prisma todavía no generado. Se reprodujo el fallo en una copia limpia de los archivos versionados, sin `generated/`, y se aisló la dependencia de BD con un mock en ese test unitario. La suite completa se volvió a ejecutar en esa copia limpia, sin generar Prisma; no se omitieron pruebas ni se relajaron los controles de CI.

El build se hizo con una URL de validación sin base accesible: catálogo/sitemap registraron sus fallbacks existentes de BD no disponible, sin impedir la compilación. El funcionamiento con PostgreSQL real se comprobó por separado en el entorno local y después del reinicio. La comprobación de formatos valida el HTML generado, no la salida física de cada modelo de impresora.

### Casos funcionales y de seguridad ejecutados

- Alta y modificación de las tres tarifas, búsqueda, historial, campos ajenos/valores inválidos y conflictos.
- Cotización con importe histórico **L 95 × 3 = L 285** conservado después de cambiar el catálogo. Venta, factura y movimiento de inventario usando los importes aprobados por el servidor.
- Prueba posterior: cambiar catálogo dejó intactos el precio de la cotización, el de la factura y su huella; **Actualizar tarifa** sí aplicó la tarifa vigente a la cotización.
- **Concurrencia real en PostgreSQL:** dos PATCH simultáneos con la misma versión produjeron **200 y 409**, con exactamente **un evento nuevo** de historial.
- Lector a 390 px: consulta sin escritura; API de modificación rechazada. Gestor a 320 px: modifica tarifas sin `productos:write`; revocar/restaurar permiso tiene efecto sin volver a iniciar sesión.
- Editor de metadatos a 768 px: puede modificar marca, pero no los tres precios. Operador fiscal: tarifa mayorista aprobada, precio falsificado ignorado y descuento adicional rechazado con 403. Cliente: órdenes propias y sin acceso a la API de precios.
- Iframe entre orígenes reales a 390 px: después del login se eliminaron cookies y se verificaron búsqueda/historial usando el transporte local autenticado existente, sin excepciones JS. **No es una prueba de login inicial sin cookies**, ni modifica la política de frames de producción.

Las respuestas negativas deliberadas (400/401/403/409) son resultados esperados. Un primer script combinado de concurrencia/iframe terminó fallando al montar un origen padre sintético; las dos comprobaciones de negocio anteriores a ese montaje sí pasaron. La prueba final de iframe usó un servidor HTTP padre real y terminó correctamente de forma independiente.

### Limpieza

Se anularon tres facturas QA y se borraron cuatro órdenes QA. Antes de eliminar el producto temporal se verificó el retorno de su stock total y por bodega a 100. Se eliminaron producto, existencias, kardex y cuatro roles/cuentas QA; se conservaron la bitácora y los **16 productos / 3 órdenes semilla**. Las fixtures se marcaron como limpiadas; no se reutilizaron esos identificadores en el smoke posterior de solo lectura.

Las capturas y los registros del navegador permanecen privados en `.local/`. Este informe no incluye credenciales, tokens ni datos de producción.
