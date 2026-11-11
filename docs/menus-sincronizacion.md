# Menú de navegación compartido

La barra inicial (antes menú 1) y la barra flotante al desplazarse (antes menú 2) utilizan la **misma configuración**. Los diseños y ubicaciones de cada barra se conservan, pero sus enlaces, grupos, acceso destacado y enlaces inferiores se editan juntos desde **Ajustes → Menú de navegación**. Login y Admin siguen fijos. Los cambios aplican a Home, Tienda, Catálogo, Contacto y las páginas públicas que utilizan la navegación compartida, tanto en escritorio como en móvil.

## Combinación de configuraciones anteriores

Al instalar esta versión se combinan automáticamente las dos configuraciones existentes. Si solo existe una configuración guardada, se utiliza esa, sin incorporar la predeterminada de la otra barra. Las entradas con el mismo identificador y los mismos valores no se duplican; los grupos y enlaces adicionales se reúnen. Si un mismo enlace o grupo tiene valores distintos, se conservan ambas versiones, incluso su estado visible u oculto, para que un administrador pueda revisarlas. Por ello puede haber entradas repetidas, o una versión visible junto a otra oculta. Se respeta el orden de la configuración del menú 1 y después se añaden las entradas del menú 2.

El acceso destacado parte del menú 1 cuando ambos existían. Si el otro acceso tenía distinto nombre, destino o visibilidad, se conserva como enlace de la barra cuando todavía no existe uno equivalente. Como solo hay un acceso destacado, la descripción anterior del menú 2 queda disponible en **Consultar accesos destacados anteriores**. Las dos configuraciones originales permanecen intactas en la base de datos como respaldo. Si una configuración estaba dañada se avisa al administrador; se usa la legible o los valores predeterminados sin borrar los datos originales.

La combinación se calcula sin modificar los registros anteriores; el primer guardado crea una nueva configuración unificada. Los endpoints anteriores de ambos menús siguen disponibles por compatibilidad y consultan o guardan esa configuración unificada. Un guardado con revisión antigua se rechaza para evitar sobreescribir cambios simultáneos.

## Edición y publicación

En **Editar desplegable visualmente** se muestran las tarjetas de grupos. Selecciona el enlace de la barra que abre el desplegable, por ejemplo Soluciones. Puedes añadir, editar, ocultar, eliminar y reordenar los grupos y sus enlaces. Los elementos ocultos se muestran atenuados para poder recuperarlos; un grupo sin enlaces visibles no aparece en el sitio. El acceso destacado y los enlaces inferiores se editan en sus apartados. Los límites permiten conservar ambas configuraciones: 21 enlaces en la barra, 16 grupos por desplegable, 40 enlaces por grupo y 20 enlaces inferiores.

Pulsa **Guardar menú** para publicar los cambios en ambas barras. Ajustes comprueba las dos consultas públicas e informa si no puede confirmar la publicación. Las páginas abiertas vuelven a consultar al recibir el aviso de guardado, recuperar el foco, volver a ser visibles o cada 15 segundos mientras están visibles. Si falla la consulta se conserva el último menú cargado; al iniciar sin conexión se muestran los valores originales. Las pestañas en dispositivos distintos pueden tardar hasta el siguiente ciclo, y el código debe estar actualizado en el servidor.

El acceso destacado originalmente llamado Tienda puede vincularse al enlace original Tienda de la barra para heredar su nombre, destino y visibilidad, o desvincularse para editarlo por separado. Los cambios de menú no activan páginas públicas desactivadas.

Ajustes agrupa sus secciones en **Sitio público**, **Empresa y facturación** y **Sistema**. Cerrar un apartado no descarta los cambios mientras permanezcas en Ajustes: si hay cambios pendientes verás «Sin guardar» junto al título. Los datos generales y fiscales se guardan por separado del menú.
