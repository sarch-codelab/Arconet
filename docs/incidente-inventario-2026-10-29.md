# Corrección del fallo de montaje de Inventario

## Síntoma

`InventarioPanel` fallaba antes de cargar sus datos con `canLookupInventoryProducts is not a function`. El límite de errores mostraba «No se pudo mostrar Inventario» y Reintentar volvía a ejecutar la misma llamada inválida.

## Reproducción y diagnóstico

- La función existe en el código de `lib/admin-navigation.js`; un arranque limpio no reprodujo el incidente.
- Se reprodujo **el mismo TypeError y la misma tarjeta de error en el navegador** sirviendo el módulo de navegación sin esa exportación, manteniendo las demás exportaciones. La alteración se limitó a las respuestas de JavaScript del navegador de pruebas; no se cambiaron archivos del servidor para simularla.
- Esto confirma que un módulo de navegación de otra versión basta para provocar el fallo. No se dispone de la caché exacta del navegador original para atribuirle una causa más específica.

## Corrección

- Inventario ya no importa ni invoca ese helper de navegación para poder montar.
- Los permisos se normalizan como arreglo y se comprueban localmente con `includes`.
- Se conserva la regla de acceso al catálogo de apoyo: `productos:read` **o** `inventario:read`, sin conceder acceso administrativo al módulo Productos.
- Escritura y eliminación continúan dependiendo de sus permisos respectivos. Las comprobaciones de autorización del servidor no cambian.
- La exportación anterior permanece disponible para compatibilidad con otros consumidores.

## Validación

- Siete regresiones ejecutan el **componente React real**, con la exportación deliberadamente ausente, para administración, inventario sin Productos, solo lectura, permisos vacíos/ausentes/nulos y sesión no disponible. Las siete fallaron con el código anterior y pasan con la corrección.
- Vitest ahora transforma JSX de `app/**/*.js` para poder probar estos montajes; no se añadieron dependencias de ejecución.
- **246/246 pruebas**, 21 archivos. Lint: **0 errores y 59 advertencias existentes**. Compilación optimizada aprobada, con 23 páginas estáticas generadas.
- Navegador real con el módulo sin exportación: Stock, Kardex, Movimientos, Bodegas y Alertas funcionan sin excepciones JavaScript.
- HTTPS embebido sin cookies: las cinco pestañas se verificaron para administrador en escritorio, operador exclusivo de inventario a 390 px y lector a 320 px, sin desbordamiento horizontal.
- Se comprobó un SKU QA sin existencias en el selector de un operador sin `productos:read`, así como controles deshabilitados y respuesta 403 para escritura con rol lector. Los datos QA de producto, trabajador/cuenta y rol se eliminaron al terminar.
- El botón Actualizar mantiene operativo el panel. Se repitió la comprobación después de compilar y reiniciar el entorno local.

No se modificaron producción ni datos de usuario. Los certificados, credenciales temporales, capturas y reportes del navegador permanecen fuera de Git en `.local/`.
