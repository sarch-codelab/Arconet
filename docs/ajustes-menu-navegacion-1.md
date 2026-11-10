# Menú de navegación 1

En Ajustes → Menú de navegación 1 se administra la barra inicial del hero en la portada y en la tienda, en escritorio y móvil. La configuración es independiente de la del menú 2, que aparece al desplazarse. Cada editor tiene sus propios cambios, guardado y restauración.

Se pueden añadir, editar, ocultar, eliminar y reordenar enlaces superiores, grupos y enlaces de los grupos. El acceso destacado y los enlaces inferiores del panel móvil también son editables; el acceso destacado aparece además en el desplegable de escritorio. Los botones Login y Admin, el logo, el carrito de la tienda y el resto de la página permanecen fijos. En escritorio, cada enlace con grupos abre su propio panel, que incluye un enlace al destino del elemento superior; en móvil se listan los grupos de todos los elementos visibles.

Los destinos admitidos son rutas locales que empiezan por `/`, anclas `#seccion` y direcciones HTTPS. En la tienda las anclas vuelven a la portada. Ocultar un enlace no desactiva ni protege la página de destino. Los visitantes ven los cambios al abrir o recargar la página; una pestaña ya abierta conserva su menú hasta la siguiente carga. Si falla la lectura pública, se usa el menú original.

La configuración se guarda en `ConfiguracionSistema` (`menu.navegacion1`) sin migración. La lectura requiere `ajustes:read` y guardar requiere lectura y `ajustes:write`; se registra la acción. La validación, límites, detección de cambios simultáneos y recuperación de datos inválidos son los mismos que para el menú 2. Restaurar original solo prepara los valores iniciales y requiere guardar para aplicarlos.
