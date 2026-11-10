# Destinos de categorías en los menús

Los enlaces originales de categorías de los menús 1 y 2 apuntaban a `/tienda/<línea>`, que muestra la ficha descriptiva antigua. Ahora apuntan a `/tienda/categoria/<línea>`, donde se muestra el listado de productos disponibles. Las páginas antiguas siguen existiendo: no se añade ninguna redirección global que pudiera romper enlaces guardados o la ficha antigua.

Las configuraciones de menú guardadas antes de este cambio reciben la corrección al leerlas: únicamente se cambian los enlaces originales cuya combinación de identificador y destino coincide con el valor antiguo. Se conservan el nombre, visibilidad, orden y todos los destinos personalizados distintos. Las configuraciones anteriores no se reescriben automáticamente en la base de datos; el editor muestra los destinos corregidos y, al guardar, almacena la versión actual. Después de ese guardado el administrador puede elegir deliberadamente la ruta anterior, y se respetará. La revisión de concurrencia sigue calculándose sobre el valor realmente almacenado.

Los enlaces de Inicio, secciones de la portada, Tienda, Contacto, Login/Admin, legales y las URLs personalizadas no se modifican. Ocultar un enlace no desactiva la página de destino.
