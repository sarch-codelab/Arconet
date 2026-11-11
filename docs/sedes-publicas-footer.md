# Sedes del pie de página

El footer compartido muestra las sucursales con estado `activo` administradas en Sucursales. Cada sede se identifica por su nombre y ciudad; los borradores y las inactivas no se publican. Si no existen sedes activas o falla la consulta, el pie informa el estado sin sustituirlo por una lista fija.

`GET /api/sedes-publicas` es de lectura pública y consulta la base sin caché. Devuelve únicamente identificador, nombre y ciudad; no expone responsable, código, teléfono, correo ni dirección. La API administrativa `/api/sucursales` conserva sus controles de acceso y edición. El footer vuelve a consultar al abrirse, recuperar el foco o la visibilidad y cada 60 segundos mientras la pestaña esté visible.

La dirección y el horario de la sección Contacto del footer siguen siendo información fija independiente de la lista de sedes; la tabla Sucursal no contiene horarios. No se modifica la base ni se crean sucursales con este cambio.
