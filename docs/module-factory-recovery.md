# Facturas y error «module factory is not available»

## Factura

La factura fiscal y la factura comercial no incluyen la columna interna `Bod.` ni la cabecera `Almacén / Ver movimientos registrados`. El espacio de esa columna se devuelve a la descripción del producto. Se conservan códigos, cantidades, unidades, precios, descuentos, ISV y totales. Los documentos operativos de cotización/compra conservan su formato existente.

## Error de módulos

El mensaje de Turbopack «Module … was instantiated … but the module factory is not available» indica que el runtime intenta instanciar una definición de módulo que no está registrada. No es lo mismo que un 502: un archivo puede haberse descargado y aun así no contener las definiciones que ese runtime espera. Es compatible con una sesión/artefactos de versiones diferentes o con una inconsistencia del runtime de Turbopack; la traza minificada sola no permite identificar la causa histórica exacta ni el código del módulo 71645 sin los artefactos correspondientes y los logs del origen.

Se toman dos medidas:

1. **Compilación de producción con `next build --webpack`**, opción oficial de la versión instalada de Next. CI y el despliegue llaman el mismo `npm run build`. Así los nuevos builds no usan el runtime de Turbopack que falla en la traza. No se cambia el bundler de desarrollo ni se actualizan dependencias ajenas al problema. Se mantienen el ID de despliegue y la retención de assets anteriores.
2. **Recuperación del error exacto** en los boundaries global y del panel. Antes no se clasificaba como fallo de módulos y «Reintentar» solo remontaba componentes con el mismo runtime fallido. Ahora se ofrece «Recargar página» con advertencia sobre cambios sin guardar. Solo se recarga por acción del usuario: no hay bucles, borrado de sesión o reenvío de operaciones.

La advertencia de preload no consumido no identifica un recurso concreto (`<URL>` es un marcador) ni demuestra un `as` incorrecto. No se desactivan indiscriminadamente los preloads: esa advertencia no repara una fábrica de módulos ausente. Si persiste tras recuperar la vista, se necesita su URL real para evaluar ese preload individual.

## Comprobaciones

- ESLint, 126 archivos / 1497 pruebas y build de producción con Webpack aprobados.
- Regresiones de factura en todos los formatos de papel: ocho columnas/celdas coherentes, sin bodega/almacén, conservando datos y totales; documentos operativos sin cambio.
- El mensaje exacto reportado ofrece recarga explícita y no se confunde con un error de API o de negocio.
- Smoke HTTP de producción: login, scripts iniciales y chunks lazy disponibles como JavaScript; runtime Webpack y no Turbopack en el HTML, ID de despliegue y protección de órdenes sin sesión (401).

No se ha desplegado esta corrección ni se ha validado el dominio público. Las pestañas antiguas no cambian de runtime en caliente: una vez desplegado el nuevo build deben recargarse. No se ejecutó un navegador gráfico ni la promoción/rollback de Windows en esta sesión.
