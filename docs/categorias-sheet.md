# Sheet de edición administrativa

El componente compartido `app/admin/edit-dialog.js` utiliza `ModalOverlay`, `Modal` y `Dialog` de `@animate-ui/react/primitives/react-aria`. Se instalaron `@animate-ui/react` y su peer `react-aria-components`; Motion ya estaba instalado. Animate UI se distribuye bajo MIT + Commons Clause, incluida en su paquete.

## Alcance vigente

Por la petición más reciente, el efecto se aplica **solo al editar**, también en categorías. Las altas conservan el modal o formulario que tenían; no se convierten en hojas laterales. Las vistas de detalle, historiales de solo lectura, confirmaciones, recepción de mercadería y flujos de emisión no se alteran.

Ediciones cubiertas:
- Categorías, clientes, trabajadores, sucursales, productos y roles.
- Cotizaciones/documentos comerciales existentes.
- Compras/cotizaciones a proveedor existentes y proveedores.
- Precios, únicamente cuando el usuario tiene permiso de escritura; la consulta del historial sigue siendo clásica.
- Perfil y áreas responsables, antes editados dentro de la página. Sus formularios normales de lectura/alta siguen embebidos.

Los formularios de ajustes siempre visibles que no tienen un modo de edición separado conservan su presentación. No se alteran permisos, contratos API ni validaciones.

## Implementación

La hoja entra desde la derecha y ocupa hasta 600 px (960 px para formularios complejos), con el ancho disponible en móvil y altura de la ventana. Animate UI gestiona entrada de 400 ms, salida de 200 ms y el velo por separado; movimiento reducido omite el desplazamiento y conserva el fundido.

React Aria gestiona portal, foco, restauración al origen, aislamiento del fondo, bloqueo de scroll y cierre por Escape/clic fuera. El controlador permanece montado y conserva una instantánea del contenido para que limpiar la selección no borre campos durante la salida. Los editores condicionales de compras/proveedores usan presencia para terminar el cierre antes de desmontarse.

Las altas clásicas siguen usando DialogBackdrop. Sus hooks de Escape y bloqueo de scroll se centralizan en EditDialog, solo cuando se necesita un modal clásico; no se duplican con los de React Aria. Las ediciones embebidas usan el modo inline para conservar su disposición anterior fuera de edición. El clon de la superficie elimina los atributos de diálogo internos: hay un solo diálogo accesible, no diálogos anidados.

`edit-sheet.module.css` está aislado: adapta geometría del modal antiguo dentro de la hoja, mantiene scroll nativo y tokens de tema al usar portal. No cambia las hojas de estilo del resto del sitio.

## Validación local

- Chromium: oscuro/movimiento normal/1440 px y claro/movimiento reducido/390 px. Edición en las nueve rutas de categorías, clientes, trabajadores, sucursales, roles, productos, proveedores, compras y perfil: hoja pegada a la derecha, un solo diálogo, foco dentro, Escape, sin desbordamiento ni errores de página. Las altas verificadas no usan la hoja.
- Comprobaciones adicionales: editores de cotización, precios y área responsable; alta de categoría clásica con Escape y bloqueo de scroll.
- CRUD real de categoría en la base local aislada: crear, editar nombre/estado, conservar slug y eliminar. No se tocaron datos de producción.
- ESLint, suite completa y compilación de producción. No se ha comprobado el despliegue público ni dispositivos físicos.
