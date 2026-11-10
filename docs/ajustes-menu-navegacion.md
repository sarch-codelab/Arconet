# Menú de navegación 2

En Ajustes → Menú de navegación 2 se administran los enlaces de la barra que aparece al desplazarse y sus grupos desplegables. Cada enlace de la barra puede tener grupos, y cada grupo puede contener enlaces; se pueden añadir, editar, ocultar, eliminar y reordenar. El acceso destacado y los enlaces inferiores también son editables. Los accesos de Login y Admin permanecen fijos. El menú 1 del hero y los pies de página del sitio no se modifican.

Los destinos admitidos son rutas locales que empiezan por `/`, anclas `#seccion` y direcciones HTTPS. En las páginas de tienda, categoría y producto las anclas se dirigen al inicio del sitio. En móvil el menú reúne todos los grupos visibles; en escritorio cada enlace con grupos abre su propio desplegable. Los grupos sin enlaces visibles no se muestran. El enlace original Tienda no se duplica en el menú móvil cuando coincide con el acceso destacado original.

Los cambios se aplican al guardar y se cargan al abrir o recargar las páginas públicas; una pestaña ya abierta conserva su menú hasta la próxima carga. Ocultar un enlace no desactiva ni protege la página de destino. Restaurar original prepara los valores originales, que solo se aplican al guardar. Recargar descarta los cambios locales previa confirmación. Si dos personas editan a la vez, la segunda debe recargar antes de guardar para evitar sobrescribir cambios.

La configuración se guarda en `ConfiguracionSistema` (`menu.navegacion2`), sin migración. La lectura del editor requiere `ajustes:read` y la escritura requiere tanto lectura como `ajustes:write`; los guardados se auditan. La API pública solo devuelve elementos visibles. Ante una configuración inválida se ofrecen los valores originales con aviso en Ajustes; ante un fallo de base de datos la carga pública usa el menú original, mientras que el editor informa del error y no habilita guardar datos no cargados.

Se admiten hasta 10 enlaces superiores, 8 grupos por enlace, 20 enlaces por grupo y 10 enlaces inferiores. La validación se aplica en el servidor.
