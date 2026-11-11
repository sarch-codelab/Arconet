# Explorar equipos en la vitrina

Debajo de las marcas, «Explora nuestros equipos» presenta hasta seis tarjetas por página y filtros independientes del buscador superior. Las flechas cambian de página; no hay desplazamiento horizontal de las tarjetas. En pantallas pequeñas se muestran dos columnas.

La opción «Todas» prioriza los productos disponibles de la tienda y después conserva las seis fichas editoriales. Las demás opciones filtran por las líneas existentes o por las ofertas editoriales indicadas en la vitrina. Los productos de tienda enlazan a su ficha real; los editoriales conservan sus rutas `/catalogo/ficha/…`. No se muestran precios, valoraciones, favoritos ni afirmaciones de recomendaciones, popularidad o ventas sin datos que las respalden.

La vitrina de ofertas existente se conserva después de esta nueva sección. Si no hay resultados se informa al visitante; cuando aún se está cargando el inventario o falla su consulta se distingue ese estado de una lista vacía.

Para fotos antiguas guardadas como datos en la base, la vitrina usa `/api/foto-catalogo/[id]`: solo devuelve la imagen principal de productos activos, no archivados y con existencia, sin caché. La API administrativa de fotos permanece protegida.
