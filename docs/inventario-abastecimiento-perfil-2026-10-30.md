# Inventario, abastecimiento, perfil e impresión · 2026-10-30

## Investigación y distinción de documentos

El manual publicado de Mónica 9/10 agrupa en Inventario los productos, compras al proveedor, cotizaciones al proveedor, bodegas y kardex. Distingue **solicitar precios al proveedor** de **formalizar la compra** y de **recibir la mercadería**; cotizar no crea existencias. También identifica «Fact. proveed.» como el número de factura entregado por el proveedor, no como el identificador interno de la orden. Véanse Inventario, Compras y Cotizaciones al proveedor, páginas 31–48. [1](http://www.monicacolombia.com/ManualMonica-9-y-10.pdf)

En Arconet quedan separados:

- **Ventas → Cotizaciones:** ofertas que Arconet entrega a sus clientes. Se mantiene el trabajo anterior de clientes, tarifas, conceptos y totales calculados.
- **Inventario → Cotizaciones a proveedores:** solicitudes/estimaciones de lo que Arconet pretende comprar. Pueden generar una compra enlazada, sin duplicarla al repetir la conversión.
- **Inventario → Compras:** órdenes con número interno, proveedor, condiciones y detalle; confirmarlas habilita su recepción, pero no crea stock ni registra pagos o envía correos automáticamente.
- **Inventario → Recepciones:** registro de lo que efectivamente llegó a una bodega, incluso parcialmente. Es el paso que crea entradas de kardex y actualiza existencias.

No se copió del documento fotografiado la identidad de Arcolab, su RTN, CAI, numeración, rango, cliente ni datos fiscales. La imagen se utilizó únicamente como referencia de estructura.

## Navegación y campos

**Productos ya no es una sección principal independiente.** Inventario reúne diez vistas, visibles según permisos: Productos, Stock, Compras, Cotizaciones a proveedores, Recepciones, Proveedores, Kardex, Movimientos, Bodegas y Alertas. Los enlaces antiguos `?section=productos`, `#productos` y `?section=compras` conservan su destino dentro de Inventario; Atrás/Adelante también conserva la vista.

| Campo de la operación | Significado e implementación |
| --- | --- |
| Número / ID de compra | Número de negocio autogenerado `OC-año-consecutivo`; el ID técnico sigue siendo independiente. Las cotizaciones usan `CP-año-consecutivo`. |
| Fecha | Fecha de negocio; las nuevas fechas de calendario se conservan al visualizar/imprimir en Honduras. |
| Requerido a | Se presenta el proveedor y, si existe, su contacto/atención. No se confunde con el cliente de Ventas. |
| Términos | Contado/efectivo o crédito con plazo explícito; 30 días es una opción directa. El plazo calcula vencimiento, no un pago. |
| Factura proveedor | Referencia externa opcional. Puede completarse después de recibir sin cambiar líneas ni existencias. |
| Compra número, en cotizaciones | Enlace al número de compra generado al convertirla. La fuente se conserva. |
| Envío | Referencia libre de guía, transportista o método de entrega. No se trata como un cargo monetario implícito. |
| Moneda | Nacional, **HNL / L**. Se rechaza otra moneda, en vez de mezclar costos sin tipo de cambio. |
| Almacén | Pendiente, recepción parcial o recibida, derivado de cantidades aceptadas. Cancelar un saldo no borra lo ya recibido. |
| Total | Cantidades × costos netos e ISV por línea; el servidor recalcula y valida precisión/límites. No usa el precio de venta como costo. |

Los productos se buscan remotamente por nombre/SKU; los costos son editables para el acuerdo de compra. Se admiten conceptos no inventariables, señalados como tales: recibirlos no crea stock. El alta de proveedor se hace dentro del borrador, con identificación opcional y sin inventarla.

## Integridad de stock y auditoría

- Cotización, creación, conversión y confirmación no generan existencias.
- Recepción parcial/total por bodega activa, con cantidades enteras y sin superar el pendiente. No se aceptan líneas repetidas ni de otra compra.
- Registro persistente de cada recepción y clave de operación única: una respuesta perdida o dos peticiones concurrentes no duplican entradas.
- La recepción utiliza el costo neto acordado; no permite reemplazarlo desde el formulario físico. Una entrada actualiza el último costo de adquisición, **no** Valor 1/2/3 de venta.
- Transacción y bloqueos para recepción, conversión y edición; control de versión para no pisar cabeceras abiertas por otra persona. Los saldos se acotan a los límites reales del almacenamiento.
- No se reescriben líneas de compras recibidas ni se borran documentos con recepción/conversión. El saldo pendiente se puede cancelar conservando cantidades y kardex.
- Una bodega con recepción/historial se desactiva, no se elimina. Las relaciones también están protegidas en BD.

## Bodega, resumen y registros

El rol predeterminado **Bodega** deja de heredar acceso a Ventas por los permisos comerciales/precios antiguos. Conserva su trabajo autorizado de inventario y abastecimiento. La migración sólo ajusta ese rol conocido; no reescribe indiscriminadamente los demás roles.

- **Resumen de Bodega** usa un endpoint propio: productos activos, agotados, bajo mínimo, bodegas, recepciones pendientes autorizadas y movimientos recientes. Se separan existencias por unidad de medida; no se suman metros y piezas como si fueran equivalentes.
- **Registros de Inventario** se filtra en el servidor, no sólo en la pantalla. Incluye actividad del área y kardex, pero no autenticación, ventas ni logs globales al cambiar parámetros de URL.
- Nuevo permiso **`compras:receive`**, independiente de editar compras. Recibir exige además `inventario:write`; consultar entregas exige lectura de inventario. Un receptor puede trabajar con un DTO físico sin totales/condiciones de compra, sin necesitar `compras:read`.
- Productos, precios, compras y eliminación mantienen sus permisos separados. Crear un producto con tarifa continúa requiriendo autorización para modificar precios; mover Productos no concede esa autorización a todos los usuarios de inventario.
- **Compatibilidad:** no se cambió ni se endureció el contrato previo de `GET /api/productos`. El DTO mínimo de recepción no implica una afirmación de privacidad global del catálogo legado.

## Apariencia personal

En **Mi perfil → Apariencia**, cualquier cuenta autenticada puede elegir Claro, Oscuro o Según el dispositivo, sin `ajustes:write`. Se persiste por usuario, no cambia nombre/rol ni otras cuentas y no escribe la preferencia del sitio público. Un fallo de guardado revierte la vista y permite reintentar. Al salir del panel se restaura el tema público; al cambiar de cuenta se monta un contexto independiente.

## Impresión

Factura, cotización comercial y documentos de abastecimiento comparten el formulario clásico: emisor a la izquierda, logo propio centrado, identificación del documento enmarcada, datos del destinatario y referencias, cuadrícula de detalle, totales, firma y monto en letras.

- **Carta de página completa** en B/N, sin inventar datos fiscales ausentes. El espacio vacío de documentos cortos se calcula con el contenido real para no mandar sólo la firma o el pie a otra hoja.
- Se conserva media carta **vertical**, la media hoja horizontal opcional y tickets de 58/80 mm. Documentos largos y formatos pequeños paginan según su contenido, sin ocultarlo.
- Numeración de páginas, totales, ISV, descuentos y datos existentes se conservan. La validez fiscal sigue dependiendo de los datos de autorización del registro/configuración, no de la apariencia.
- Mismo visor/iframe autenticado, selector de papel, guardar copia, cierre e impresión sin pestañas nuevas. Sin tokens en URL/storage/HTML descargado y sin relajar CSP/X-Frame-Options.

## Comprobación local

- **588 pruebas / 33 archivos**, todas correctas; se mantiene la suite previa de Ventas, precios, impresión, portal y permisos. ESLint completo: **0 errores**, las mismas **59 advertencias preexistentes**.
- **284 recorridos** a 320/390/768/1440 px: 52 entradas a las 13 secciones, 188 píldoras, 16 subpestañas fiscales, 20 filtros de Productos y 8 formularios de compra/cotización. **0 errores JS, 0 errores API, 0 overflow horizontal**; modales centrados y controles móviles de 16 px.
- Flujo real: alta de proveedor sin RTN con 503/reintento y borrador preservado; cotización **11304.34 + ISV 1695.65 = 12999.99**, crédito 30, conversión única, confirmación y recepción parcial/total.
- Pérdida simulada de respuesta **después del commit** y doble recepción concurrente: stock/kardex se incrementan una sola vez por operación. Precio de venta normal/descuento/mayorista conservado.
- Rollback real por saldo fuera de rango en la segunda línea: se revierten también stock, costo, kardex, cantidades y recibo de la primera. Cancelación parcial, sobre-recepción, versión obsoleta y borrado de históricos protegidos.
- Bodega sin APIs comerciales/fiscales/reportes/logs globales; receptor sin lectura financiera de compras; catálogo sin inventario: navegación y permisos efectivos/revocación correctos.
- Tema: persistencia al recargar, independencia entre cuentas, reversión ante 503 y cambios de preferencia del dispositivo. Sin permiso de configuración global.
- **30 PDF** revisados: Carta/media carta/tickets, montos/pies completos, sin texto fuera de página; documentos de 42 renglones conservan todas las líneas. Casos cortos de Carta y media carta vertical en una página. Impresión de compra real en iframe, logo y fecha correctos, sin nueva pestaña; regresión de venta calculada 1700.00 correcta.
- Dos migraciones aditivas validadas y aplicadas únicamente a PostgreSQL local. Compilación de producción con URL ficticia local como CI; los avisos de catálogo/sitemap sin BD son el fallback conocido, no una conexión a producción.
- Fixtures eliminados. Regreso a **16 productos, 3 órdenes comerciales, 3 clientes, 0 facturas, 1 compra de demostración, 0 recepciones, 1 proveedor y 2 bodegas**. Huellas de todas las filas de negocio ajenas al fixture iguales antes/después de limpiar.

## Límites expresos

Esta entrega implementa el ciclo de abastecimiento solicitado, **no una copia completa de la contabilidad de Mónica**: no genera automáticamente cuentas por pagar, pagos bancarios, asientos contables, conversión de divisas, costeo promedio/FIFO o devoluciones al proveedor. El plazo de crédito no debe interpretarse como un saldo contable conciliado. La lista de abastecimiento identifica que muestra los últimos 200 documentos.

La QA de navegador/PDF se hizo en Chromium local; no se afirma prueba física de Safari/iPhone ni de una impresora. Capturas, cookies, sesiones, conexiones y harnesses privados están excluidos de Git. Sin despliegue manual ni acceso a la BD/servidor de producción.
