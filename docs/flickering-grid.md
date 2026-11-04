# Flickering Grid

Adaptación JavaScript del fondo Magic UI de Dillion Verma, con licencia MIT conservada. No añade dependencias.

`SiteFlickeringGrid` se monta una vez en el layout y detecta los contenedores `main`, sus secciones de fondo y superficies explícitas `data-flickering-grid="on"`. El shell administrativo utiliza este marcador porque tiene su propio fondo opaco. No decora tarjetas individuales ni paneles fotográficos. `data-flickering-grid="off"` permite excluir una superficie y sus descendientes.

Se excluyen los fondos CSS con `url()` o `image-set()`, incluidos pseudoelementos y ancestros. Los gradientes no se consideran fotografías. Imágenes y vídeos dentro de secciones permanecen delante del fondo decorativo y no se alteran. Los accesos administrativo y de clientes conservan sus fondos fotográficos sin rejilla. Las nuevas páginas con `main` se detectan automáticamente; una superficie futura de estructura especial puede usar el marcador explícito.

Cada canvas queda detrás del contenido, con `aria-hidden`, sin eventos y sin alterar colores de fondo, textos, imágenes o animaciones. Solo se posiciona relativamente una superficie estática y se aísla su apilamiento; al retirarla se restauran los estilos previos.

Un único RAF compartido dibuja únicamente superficies visibles, limitado a unos 15 cuadros/segundo. Con movimiento reducido conserva un parpadeo suave a dos actualizaciones/segundo y menor frecuencia de cambio por celda. Se pausa en pestañas ocultas y libera observadores, RAF y superficies al desmontarse. La memoria de cada canvas se limita a 1600 px de ancho y una porción de alto de la ventana, aunque la página tenga miles de píxeles; el lienzo se desplaza dentro de su superficie al hacer scroll. No hay dimensiones animadas ni exportación de imágenes por cuadro. Se omite en impresión y colores forzados.

Validación local: Chromium en claro/oscuro y movimiento normal/reducido, 390/1440 px, inicio/tienda/privacidad/login/admin y sesión administrativa en Monica IA. Se verificaron parpadeo real, límites del canvas, ausencia del cursor personalizado y del glow en Monica, preservación de fondos fotográficos y ausencia de desbordamiento/errores de página. No equivale a una validación en dispositivos físicos ni del despliegue público.
