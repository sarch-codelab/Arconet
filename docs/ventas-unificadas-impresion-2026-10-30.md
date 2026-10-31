# Ventas unificadas e impresión sin relleno — 2026-10-30

## Solicitud

Corregir la factura comercial breve que en iPhone/AirPrint A4 vertical, al 100 %, dejaba una tabla casi vacía en la primera hoja y los totales/firma en la segunda. Evitar además una tercera entrada de creación «Nueva factura»: ya existen «Nueva venta» y «Nueva cotización».

## Cambios

### Impresión

- Se elimina el cálculo JavaScript que estiraba la tabla con una fila vacía según las dimensiones de una hoja de pantalla. «Automático» no puede asumir que la impresora usa Carta cuando el papel real es A4.
- Las tablas ya no generan filas de relleno. CSS de impresión anula con `!important` cualquier altura inline heredada y oculta el relleno. No depende de `beforeprint`, de medir el iframe móvil ni de ejecutar JavaScript para que un documento corto quepa.
- Totales, notas, autorización fiscal cuando corresponde, firma, importe en letras y pie comparten un cierre en flujo normal que evita la fragmentación cuando cabe. Si el contenido es largo, continúa paginando, sin recortarlo.
- Se conservan el diseño clásico en blanco y negro, el logo propio, encabezados repetidos y datos fiscales/comerciales existentes. Carta y media carta **vertical** permanecen; media hoja horizontal y tickets siguen siendo opciones adicionales.
- Se conserva el visor autenticado `srcDoc`, impresión en el mismo iframe, selector de papel, copia HTML y cierre. No se agregan pestañas, tokens en documentos/URLs ni cambios a CSP/X-Frame-Options.

### Creación y gestión

- «Nueva venta» y «Nueva cotización» se centralizan en Ventas, disponibles también al consultar Precios o Facturas según permisos.
- Si el usuario tiene ambos permisos, Nueva venta permite elegir **Comprobante comercial** o **Factura fiscal**. Si sólo puede crear uno, entra directamente a ese modo. La elección es un diálogo nativo centrado, con fondo inerte, cancelación y devolución de foco.
- El modo comercial utiliza la creación comercial existente; el fiscal abre el formulario fiscal existente. Son excluyentes: no se crea una orden comercial antes de emitir la factura ni se introducen enlaces `ordenId` o conversiones de ventas ya registradas.
- «Facturas» queda como registro/gestión, impresión, anulación, libro de ventas y configuración. Se retiran la píldora y el botón independientes «Nueva factura».
- El editor fiscal y el panel comercial permanecen montados al navegar entre las píldoras de Ventas, conservando estado y referencias. Volver del editor fiscal conserva el borrador; emitir correctamente lo cierra y muestra el registro.
- La apertura comercial restablece los filtros de tipo/estado correspondientes, para no crear una venta pendiente dentro de un filtro de aprobadas que la oculte.
- Cotizar no descuenta inventario. El modo fiscal exige sus propios permisos y puede utilizarse sin `ordenes:*`, sin montar el panel comercial ni solicitar sus APIs. Sólo lectura no ofrece creación.
- Se corrige el aviso de CAI: una emisión sin rango queda sin numeración/validez fiscal; configurar posteriormente el rango **no** numera retroactivamente los documentos existentes.
- No cambian API de emisión, transacciones, reglas de stock, tarifas, pagos, entregas, devoluciones ni validación de autorizaciones.

## Verificación

Entorno aislado `dev:local`, PostgreSQL 17 de demostración y Next 16.4.3. Sin acceso ni cambios a datos de producción.

| Control | Resultado |
| --- | --- |
| Tests Vitest | **614 / 614**, 34 archivos; incluye 26 regresiones nuevas respecto a 588 |
| ESLint | **0 errores**, 58 advertencias existentes; sin reglas desactivadas |
| Prisma validate | PASS, sin migraciones nuevas |
| Build de producción | PASS; la URL dummy de CI provoca el error de catálogo capturado y su fallback habitual, no un fallo de compilación |
| Recorrido general | **52 entradas y 220 píldoras**, 13 secciones en 1440, 1024, 390 y 320 px; 0 errores JS, API, consola u overflow horizontal |
| Selector comercial/fiscal | **10 combinaciones** de viewport y tema, incluidos 320×568 y 667×375; centrado, desplazamiento interno cuando hace falta, navegación de foco, cancelación y restauración del scroll |
| PDF automatizados | **91** en Chromium 153, con escala **1.0** y revisión del texto y límites de página |

### Impresión

La matriz de 87 documentos sintéticos cubre venta, cotización, factura fiscal y compra; automático A4/Letter, Carta, media carta vertical, media hoja horizontal, rollos de 80/58 mm y automático en esos anchos. Incluye viewport móvil y escritorio, JavaScript desactivado, altura inline de 1200 px/fila vacía simuladas, 1/8/42/100 líneas y 180 notas numeradas.

- Los ejemplos de una línea contienen todo el cierre en **una página** en automático A4/Letter, Carta y media carta vertical al 100 %, también sin JavaScript o con altura heredada.
- Los documentos largos conservan todas sus líneas y notas, el total, firma y datos fiscales; los encabezados de detalle se repiten. No se exige forzar documentos extensos dentro de una hoja pequeña. Por ejemplo, ocho líneas fiscales completas pueden necesitar dos hojas sin relleno artificial.
- Otros cuatro PDF verifican documentos realmente emitidos en la base local: HTML extraído del visor comercial móvil, factura fiscal real pendiente en A4 y Carta y copia HTML descargada/reabierta en media carta vertical. Los cuatro caben completos en una página; la copia conserva 139.7 × 215.9 mm y la selección guardada.
- En el visor real se verificaron carga de logo/datos, llamada a imprimir en ese mismo iframe, guardar copia y cerrar sin abrir otra pestaña ni introducir tokens en el HTML.

**Límite de la prueba:** emulación móvil y generación PDF con Chromium, no Safari físico ni una impresora AirPrint real. El caso aportado por el usuario identifica el fallo original; no se presenta como una prueba física realizada después de la corrección. La solución elimina la dependencia de mediciones/beforeprint que lo provocaba.

### Operación y permisos reales

1. Venta comercial con dos unidades a tarifa mayorista y un concepto: **L 167.00**, un POST/una orden, cero facturas y una sola salida de dos unidades. Snapshot de venta normal 80/mayorista 60, no costo 30. Doble activación del botón no duplica el envío.
2. Cotización con dos unidades: sin movimiento de inventario ni documento fiscal.
3. Borrador fiscal conserva cliente y líneas al cruzar Documentos, Libro, Configuración, Precios y Todas. El alta eventual desde una búsqueda numérica no inventa identificación ni pierde el detalle.
4. Stock insuficiente rechaza la emisión con rollback. Corregir cantidad y emitir genera **un POST/una factura, cero órdenes nuevas**, total **L 330.05**, y una única salida de tres unidades.
5. Rol exclusivamente fiscal crea directamente desde Nueva venta, total **L 92.00**, sin llamar `/api/ordenes`, `/api/clientes` ni `/api/productos`; los selectores usan sus consultas autorizadas. Rol comercial no recibe acceso fiscal; sólo lectura no puede crear ni anular.
6. Cuatro intentos directos no autorizados contra POST comercial/fiscal devuelven **403**, sin movimientos ni cambios de stock.

### Limpieza y entrega

Se eliminaron exclusivamente los fixtures de QA (producto, clientes, órdenes, facturas, movimientos, roles/cuentas temporales y sus logs). **Las 15 tablas originales coinciden por SHA-256 con su estado inicial**: 16 productos, 3 clientes, 3 órdenes, 0 facturas, 1 compra, 0 recepciones, 1 proveedor y 2 bodegas, entre otras.

Herramientas, sesiones, capturas, PDF, configuración local y hashes de comprobación permanecen fuera de Git. No se cambian dependencias ni se ejecuta despliegue manual. La entrega se realiza desde la rama de trabajo mediante PR, CI y fusión a `main`.
