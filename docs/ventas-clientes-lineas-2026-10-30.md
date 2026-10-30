# Clientes, líneas y totales comerciales · 2026-10-30

## Alcance

- Cotizaciones, ventas y facturas usan búsqueda incremental de clientes por nombre o identificación **guardada**. Los resultados distinguen homónimos mediante RTN/identificación y contacto; no crean identificaciones ni seleccionan automáticamente la primera coincidencia.
- Alta explícita «Guardar y usar cliente»: nombre obligatorio, identificación y contacto opcionales. Se guarda al cliente por separado; cancelar el documento no lo borra. Un error, reintento o alta no descarta las líneas, fecha, notas ni selección del documento.
- Productos del catálogo mediante búsqueda remota, más conceptos/servicios libres. Cantidades, tarifas y totales calculados sustituyen el monto aislado de una nueva operación. «Añadir producto» ya no depende de una precarga administrativa ni de elegir primero al cliente.
- Valor 1 sigue siendo precio de venta; Valor 2, descuento; Valor 3, mayorista. Nunca se muestra el costo como precio comercial. Cambiar de cliente/cabecera no actualiza tarifas históricas; actualizar una tarifa requiere la acción explícita correspondiente.
- Los documentos nuevos de personal requieren de 1 a 100 líneas válidas. El portal conserva la solicitud sin detalle. Los históricos sin líneas permiten editar su cabecera conservando el monto, pero no convertirse en venta vacía. Un documento detallado no se puede guardar sin líneas.
- Los importes históricos se conservan mientras no cambie el detalle financiero. Se distinguen «Total guardado» y total calculado. Cálculo comercial redondeado por línea; previsualización fiscal alineada con el servidor, incluyendo ISV y descuentos.

## Permisos y seguridad

- Nuevos endpoints `/api/ventas/clientes` y `/api/ventas/productos`: sesión de personal y permisos comerciales efectivos comprobados en BD. Respuestas mínimas, búsqueda parametrizada, resultados acotados y `no-store`; no incluyen costo, stock, auditoría ni cuentas.
- Es una consulta de referencias para documentos autorizados, no una concesión de CRUD administrativo. Crear clientes sigue exigiendo `clientes:write`. No se modificaron los permisos ni el contrato previo de `GET /api/productos`, que conserva su autenticación/DTO existentes.
- Revocar el permiso en BD surte efecto en la sesión ya abierta. El portal no puede enumerar referencias de terceros mediante estos endpoints.
- Combobox con teclado, resultados distinguibles, selección explícita, anulación de búsquedas obsoletas, timeout de 12 segundos y reintento sin cerrar el documento. Los metadatos pendientes no se presentan como una identificación ausente o un precio cero confirmado.
- La emisión y los guardados siguen recalculándose en el servidor con las tarifas autorizadas. Se validan precisión, cantidades, límites de líneas e importe máximo de `Decimal(12,2)`, también después de resolver precios del catálogo.
- Sin cambios de esquema/migraciones, CSP, X-Frame-Options ni transporte de impresión. Sin tokens nuevos en URL, almacenamiento o HTML descargado.

## Inventario e históricos

- Cotizar no descuenta inventario. Venta/emisión conserva sus comprobaciones transaccionales de stock.
- Editar cabecera o sólo precio/tarifa de una venta no devuelve y vuelve a retirar stock: se comparan las cantidades agregadas por producto. Reordenar o dividir líneas con las mismas cantidades no crea movimientos ficticios.
- `lib/ventas.js` y los flujos de pagos, entregas y devoluciones permanecen intactos. Los nuevos helpers de formulario viven en `lib/ventas-form.js` y son aptos para el cliente.

## Validación local

Todo se ejecutó en el entorno local aislado; sin acceso a BD/servidor de producción ni despliegue manual.

| Comprobación | Resultado |
| --- | --- |
| Suite completa Vitest | **469 pruebas / 29 archivos**, todas correctas |
| ESLint completo | **0 errores**, 59 advertencias preexistentes |
| Prisma validate | Correcto; sin cambios de esquema |
| Compilación de producción | Correcta, usando una URL ficticia de BD local como CI |
| Panel completo | **256 recorridos** en 320, 390, 768 y 1440 px: 56 entradas a las 14 secciones, 184 píldoras y 16 subpestañas fiscales; **0 errores JS, 0 errores API, 0 overflow horizontal del documento** |
| Cotización y venta móvil/tableta/escritorio | Modal centrado, catálogo remoto, homónimos, RTN con/sin separadores, tildes, teclado/Escape y tarifas correctas |
| Alta eventual real | Sin RTN inventado; cancelar/reabrir conserva datos; correo inválido, 503, reintento, bloqueo durante envío y guardado independiente correctos |
| Venta con stock insuficiente | 400 recuperable; corregir cantidad y guardar no duplica al cliente |
| Importes reales | Venta 170.00; cotización 90.02; histórico 123.45 conservado; snapshot/tarifa 35 conservado hasta cambio explícito |
| Fiscal sin lectura administrativa de catálogos | Subtotal 180.04 + ISV 27.00 = **207.04**; stock correcto, sin GET de clientes/productos administrativos desde ese flujo |
| Fallos y carreras | 503, búsqueda/ID obsoletos y timeout de 12 s: reintento sin pérdida ni selección errónea |
| Kardex real | Cabecera y cambio de tarifa de venta 170.00 → 190.00 sin nuevos movimientos ni cambio de existencias |
| Borrador fiscal | Alternar Documentos/Nueva factura conserva líneas y alta sin guardar; controles móviles de 16 px y sin overflow a los cuatro anchos |
| Impresión real de cotización y factura nuevas | Visor/iframe autenticado, logo, datos y totales; sin pestaña nueva. No se inventó CAI ni identificación ausente |
| Portal | Solicitud vacía con monto 0 admitida; referencias comerciales ajenas rechazadas |

La primera ejecución paralela del recorrido completo saturó el mismo bucket de IP y recibió 429. Se repitió con cuatro contextos locales de dispositivo independientes: el recorrido final pasó sin errores API. **No se alteraron ni desactivaron los límites de acceso de la aplicación.** Los 400/503 de los flujos de recuperación fueron provocados/controlados y esperados.

## Limpieza e invariantes

Se eliminaron únicamente los fixtures de QA: 3 productos, 5 órdenes, 4 clientes, 1 factura, 2 usuarios, 2 roles y sus movimientos/dependencias. La BD volvió a **16 productos, 3 órdenes, 3 clientes y 0 facturas**. Se compararon huellas de las filas de negocio ajenas al fixture antes/después de la limpieza, incluyendo líneas, existencias y kardex: sin modificaciones.

Cookies, sesiones, configuración privada, harnesses, capturas y resultados detallados de QA están excluidos de Git. No se publican KEY, secretos ni credenciales.

## Límites de la comprobación

La prueba de navegador fue Chromium local con tamaños de pantalla; no se afirma una prueba física de Safari/iPhone ni de una impresora. Se mantienen el diseño B/N, logo, formatos carta/media carta vertical, formatos opcionales y transporte sin popups previamente verificados; no se rediseñó la impresión en este cambio.
