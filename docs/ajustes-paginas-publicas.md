# Disponibilidad de páginas públicas

En Panel administrativo → Ajustes → Páginas del sitio público se puede activar
o desactivar Catálogo, Tienda, Contacto, Ayuda, Garantías y las páginas
legales. Catálogo y Tienda incluyen sus rutas internas. El cambio se guarda
inmediatamente por página, requiere confirmación al desactivar y se registra en
la bitácora. Leer requiere `ajustes:read`; cambiar requiere `ajustes:read` y
`ajustes:write`.

Una página desactivada responde con una redirección temporal 307 sin caché a
un aviso de indisponibilidad (noindex). No borra contenido, no oculta enlaces
ni desactiva endpoints o funcionalidades de API: **no es un control de
seguridad**. Inicio, acceso de clientes, panel, APIs e imágenes permanecen
accesibles para no perder navegación, autenticación o capacidad de recuperación.
Las antiguas URLs de `/catalogo/producto` y `/catalogo/categoria` conservan su
redirección existente hacia Tienda y se rigen por la disponibilidad de Tienda.

Las páginas se activan por defecto. El estado se guarda en
`ConfiguracionSistema`, sin migración nueva. El proxy conserva una caché de
cinco segundos por proceso: los cambios pueden tardar unos segundos en verse.
Si la base de datos falla, se usa el último estado conocido; si no existe uno,
el sitio queda disponible para evitar una caída general. El panel comunica los
errores y no confirma un cambio que no se guardó.

Las rutas controladas usan navegación completa desde la transición del sitio
para no reutilizar una precarga anterior al cambio. Las pestañas que ya estén
mostrando una página y la caché de historial del navegador pueden seguir
mostrando contenido anterior hasta que vuelvan a navegar o recargar.
