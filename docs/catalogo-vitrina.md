# Vitrina `/catalogo`

## Petición

> «En base a la imagen quiero que crees un catálogo. Para acceder a esa página
> será por `/catalogo`, ¿entendido? Al terminar, merged por favor.»

Se confirmaron dos decisiones antes de escribir código:

1. **`/catalogo` es una página nueva e independiente.** `/tienda` queda igual y
   solo se retira el `301` de la raíz `/catalogo`. Las redirecciones de
   `/catalogo/categoria/:slug`, `/catalogo/producto/:slug` y de las líneas
   antiguas se conservan.
2. **Diseño de la imagen + marca Arconet.** Misma estructura y jerarquía visual
   que la referencia, pero con el logo de Arconet y líneas y equipos de
   telecomunicaciones.

## Por qué había que tocar `next.config.mjs`

Antes existía `{ source: "/catalogo", destination: "/tienda", statusCode: 301 }`
y un test que lo exigía. Las redirecciones de Next se evalúan **antes** de las
rutas y de los archivos estáticos: con ese `301`, `app/catalogo/page.js` nunca
se habría visto. Se quitó solo esa entrada y se actualizó
`tests/tienda-routing.test.js`.

No se usó un comodín `/catalogo/:path*` porque las fotos del sitio viven en
`public/catalogo/` y se sirven como `/catalogo/...`; un comodín las mandaría a
`/tienda/...`. Verificado: `/catalogo/prod-fusionadora.jpg` y
`/catalogo/lineas/cards/pasivos.webp` responden 200 con su MIME.

## Estructura de la página

| Bloque | Contenido |
| --- | --- |
| Cabecera | logo Arconet + lema, buscador funcional, navegación y acceso |
| Barra de líneas | 7 chips que filtran los productos; idioma/región/moneda |
| Hero | imagen generada con el panel azul en diagonal y el cluster de equipos; 3 destacados con flechas, CTA y círculo «Novedades» |
| Cuadrícula de categorías | **6 cuadros con foto de fondo y etiqueta blanca**, inspirados en el «Featured Category Grid»; 5 líneas reales + ofertas |
| Productos destacados | **grupos de hasta 6 equipos** con foto, nombre, línea y etiqueta de oferta; sin precio, sin carrito y sin corazón |
| Vitrina de fabricantes | título centrado «Marcas que distribuimos», flechas y **grupos de hasta 6 tarjetas** con logotipo o nombre, justo debajo de Productos destacados |
| Ventajas | envíos, pagos, garantía y soporte |
| Ideas | **grupos de hasta 6 tarjetas**, con 12 ideas, fotos y enlaces a líneas reales |
| Ofertas y boletín | tarjeta azul + formulario de correo + **imagen del sobre azul** aportada por el usuario |
| Cierre | 4 promesas y «Síguenos», más el `<Footer />` compartido |

### Funcionalidad real, no maqueta

- El **buscador** y los **chips** filtran la fila de productos en cliente
  (y hay estado vacío con botón para limpiar).
- **Flechas de las filas**: productos, marcas e ideas avanzan por grupos de
  hasta seis. Las fichas conservan sus flechas para productos relacionados.
  No se interceptan gestos y el scroll vertical sigue funcionando.
- **Flechas del hero** cambian entre tres destacados.
- **Boletín**: `<form action="/contacto" method="get">` con `name="correo"`.
  No hay endpoint de suscripciones; en vez de fingir un alta, el formulario
  lleva a Contacto con el correo como parámetro.
- Cada tarjeta enlaza a una línea real de `/tienda/categoria/...`.

### Imágenes

- `public/catalogo-vitrina/hero-banner.jpg` (~70 KB): generada para esta
  vitrina, con el panel azul diagonal y los equipos de fibra óptica, sin texto
  (el texto va en HTML). Es la única imagen con `priority` de la vista.
- `public/catalogo-vitrina/sobre-novedades.webp` (~44 KB, 520 × 371): recorte
  con transparencia de la imagen de sobre azul que aportó el usuario. Sustituye
  al sobre dibujado con CSS y al icono `Mail` en «Recibe las novedades». No
  lleva `priority`, así que no se precarga.
- `public/catalogo-vitrina/regalo-ofertas.webp` (~31 KB, 358 × 360): el
  regalo 3D azul con estrellas verdes que aportó el usuario para «Ofertas
  exclusivas para ti». El PNG original ya traía canal alfa, así que solo se
  recortó al contenido útil y se convirtió a WebP; no se horneó el fondo
  negro ni se hizo chroma key. No lleva `priority`.
- `public/catalogo-vitrina/categorias/*.webp` (~160 KB en total): las 6 fotos
  de la cuadrícula de categorías, buscadas en internet a petición del usuario.
  Son de stock libre de **Pexels** y **Unsplash** (licencias que permiten uso
  comercial sin atribución obligatoria; se acreditan igualmente más abajo).
  Se recortaron a 1.6:1 y se convirtieron a WebP. Ninguna lleva `priority`.
- Las fotos de productos e ideas siguen siendo las que ya estaban en el repo:
  `public/catalogo/prod-*.jpg`, `public/catalogo/sol-*.jpg`,
  `infraestructura.jpg` y `hero-fiber.jpg`.
- El logo cumple el contrato de rendimiento: `sizes="132px"`,
  `loading="eager"` y `fetchPriority="low"` (React 19 no lo precarga).

## Estilos y compatibilidad

- `app/catalogo/catalogo-experience.module.css` define variables locales
  (`--accent`, `--accent-ink`, `--surface`, `--soft`, …) con variante para
  `html[data-theme="dark"]`. El hero mantiene sus colores claros porque es una
  fotografía.
- Cortes en 1180, 900, 620 y 400 px: la rejilla de tarjetas de línea baja a
  3/2 columnas, las tarjetas de las filas deslizantes ajustan su ancho, la
  navegación se oculta en tablet, el buscador pasa a su propia fila en
  teléfono y el hero usa un velo degradado para que el texto siga legible.
- Solo hay transiciones de `hover`, sin `@keyframes`: el contrato global de
  `tests/animaciones-siempre-activas.test.js` enumera los únicos CSS con bloque
  `prefers-reduced-motion`, y esta vista no añade ninguno. Las flechas se
  desplazan de forma instantánea para que las tarjetas queden alineadas.

## Acento azul (6 de noviembre de 2026)

A petición del usuario, la vitrina dejó de usar el rojo de la referencia y pasó
al **azul de marca `#1544b5`**, el mismo de home y `/tienda`:

- `--accent: #1544b5` para fondos y botones, con `--accent-dark: #11358f` para
  el hover.
- Se añadió `--accent-ink` para texto, iconos y bordes: `#1544b5` en claro y
  `#7fa6ff` en oscuro. El azul saturado solo daba **2.18:1** de contraste sobre
  `--surface: #11161d`, mientras que la tinta clara llega a **7.61:1**. Los
  textos que van sobre fondo blanco dentro de la tarjeta de ofertas conservan
  `--accent` para no perder contraste.
- `public/catalogo-vitrina/hero-banner.jpg` se recoloreó píxel a píxel: solo
  los píxeles con dominante roja y `G≈B` se sustituyeron por el azul de marca,
  con máscara suave en el borde diagonal y en las sombras de contacto. El
  medidor naranja, el cable amarillo y los conectores azules de los equipos
  quedaron intactos (no se regeneró la fotografía con IA).
- La bandera `HN` de la cabecera ya era azul y no se tocó.

En su momento no se cambió la estructura, los textos, los enlaces ni `/tienda`.
Los precios se retiraron en el ajuste siguiente.

### Verificación de este ajuste

- `npm run lint`: 0; `npm test`: **147 archivos / 1624 pruebas** (6 nuevas en
  `tests/catalogo-azul.test.js`); build de producción y
  `ops/verify-static-assets.mjs` correctos.
- Chromium headless local a 1440 × 900, temas claro y oscuro: capturas del hero
  y del bloque de ofertas/boletín, `--accent: #1544b5` en ambos,
  `--accent-ink: #1544b5` / `#7fa6ff`, sin errores de consola ni
  desbordamiento horizontal. **Es verificación en navegador local, no en el
  despliegue público ni en dispositivos físicos.**

## Fila deslizante, sin precios/carrito/corazón y sobre real (6 de noviembre de 2026)

Nota histórica: el desplazamiento directo descrito aquí fue sustituido por el control con flechas de la sección final.

A petición del usuario, sobre la misma vitrina azul:

- **Sobre real**: el recuadro azul con el icono `Mail` y su degradado
  (`.envelope::before`) se sustituyó por
  `public/catalogo-vitrina/sobre-novedades.webp`, la imagen de sobre azul
  brillante que envió el usuario, recortada al contenido útil y con canal
  alfa conservado. Se mantiene la ligera rotación decorativa.
- **Una sola fila en ambas secciones**: `.productGrid` (6 columnas) y
  `.ideaGrid` (5 columnas) pasaron a `.productRow` / `.ideaRow` con
  `display: flex`, `overflow-x: auto` y `scroll-snap-type: x mandatory`. Cada
  tarjeta tiene un ancho fijo por tramo y `scroll-snap-align: start`. Se
  añadieron flechas anterior/siguiente en los dos encabezados.
- **Sin precios**: se eliminaron `price` y `likes` de `PRODUCTS`, el pie de la
  tarjeta y las reglas `.price` / `.like`. La cotización se hace en `/tienda`.
- **Sin carrito ni corazón en `/catalogo`**: se quitaron los botones de
  favoritos y carrito de la cabecera, el estado de favoritos, `useCart`, los
  corazones de las tarjetas y de la barra de región, y el icono de corazón de
  «Recomendado por técnicos». **No se tocó** el `CartProvider` del layout, el
  `CartDrawer` compartido ni el carrito de `/tienda`: solo esta vitrina deja de
  ofrecer esos controles.
- Se conserva todo lo demás: acento azul, hero, textos, enlaces, buscador,
  chips, `301` antiguos, `public/catalogo/` y el footer compartido.

### Verificación de este ajuste

- `npm run lint`: 0; `npm test`: **148 archivos / 1633 pruebas**, incluidas 9
  nuevas en `tests/catalogo-fila-deslizante.test.js`; build de producción y
  `ops/verify-static-assets.mjs` (17 HTML / 51 assets) correctos.
- Chromium headless local, escritorio 1440 × 900 en tema claro y oscuro y
  móvil 390 × 844: ambas filas con `display: flex`, `overflow-x: auto` y
  `scroll-snap-type: x mandatory`; en escritorio `scrollWidth` 1744 (productos)
  y 1752 (ideas) frente a 1368 visibles. Las flechas avanzan 292 y 352 px. El
  sobre carga (`naturalWidth: 160`), no hay precios, corazones ni carrito en
  `<main>`, el desbordamiento horizontal del documento es 0 y no hay errores
  de consola. `--accent: #1544b5` y `--accent-ink: #1544b5` / `#7fa6ff`.
- **Son comprobaciones y capturas locales**, no verificación visual humana ni
  del despliegue público.

## Cuadrícula de categorías con fotos (6 de noviembre de 2026)

A petición del usuario, los **6 cuadros** que van justo encima de «Lo más
buscado / Productos destacados» dejaron de ser tarjetas con miniatura y
subtítulo y pasaron a un diseño parecido al **«Featured Category Grid»** de la
imagen de referencia:

- Cada cuadro es una **foto a sangre** (`next/image` con `fill` y
  `object-fit: cover`), relación 1.6:1 y esquinas redondeadas, con la etiqueta
  en blanco abajo a la izquierda sobre un degradado oscuro. Se añadió un tinte
  de color suave por categoría (`--category-tint`) para darles una familia
  visual común sin ocultar el equipo real. «Ofertas» conserva el azul de marca
  `#1544b5` como tinte dominante.
- Las 6 fotos son de telecomunicaciones y se **buscaron en internet**: fibras
  ópticas, conectores/patch panels, un instrumento de medición, racks de data
  center, un técnico con herramientas y fibra iluminada para ofertas.
- Se mantiene la rejilla de 6 columnas en escritorio (3 y 2 en tablet/teléfono,
  que recuerda las dos filas de la referencia), los 6 enlaces a líneas reales
  de `/tienda`, el acento azul, el hero, las filas deslizantes, la ausencia de
  precios/carrito/corazón y el footer compartido.
- Se retiraron `.categoryThumb`, `.categoryCopy`, `.categoryArrow` y
  `.dealsIcon`, que solo servían al diseño anterior.

### Créditos de las fotos

| Archivo | Fuente |
| --- | --- |
| `categorias/fibra-optica.webp` | [Pexels — fiber optic cables](https://pexels.com/search/fiber%20optic) |
| `categorias/componentes-pasivos.webp` | [Pexels — fiber optic connectors](https://pexels.com/photo/close-up-photo-of-plugged-cables-1624895) |
| `categorias/instrumentos.webp` | [Pexels — digital multimeter](https://pexels.com/photo/close-up-photo-of-a-digital-multimeter-5806812) |
| `categorias/gabinetes-racks.webp` | [Pexels — server racks](https://pexels.com/photo/data-center-server-racks-with-active-equipment-37730212) |
| `categorias/herramientas.webp` | [Pexels — electrician tools](https://pexels.com/search/electrician%20tools) |
| `categorias/ofertas.webp` | [Unsplash — fiber optic lights](https://unsplash.com/photos/blury-lights-illuminate-fiber-optic-cables-eMoMpSKE8eE) |

Se descartaron resultados de bancos de pago (Unsplash+, Dreamstime) y de
tiendas (eBay) para no meter imágenes con licencia restrictiva ni marcas de
agua. Las fotos se guardan optimizadas en el repo, no se sirven en caliente
desde el CDN de terceros.

### Verificación de este ajuste

- `npm run lint`: 0; `npm test`: **149 archivos / 1638 pruebas**, incluidas 5
  nuevas en `tests/catalogo-categorias-grid.test.js`; build de producción y
  `ops/verify-static-assets.mjs` correctos.
- Chromium headless local (claro/oscuro 1440 × 900 y móvil 390 × 844): los 6
  cuadros cargan sus fotos, no hay desbordamiento horizontal ni errores de
  consola. **Son comprobaciones y capturas locales**, no verificación visual
  humana ni del despliegue público.

## Regalo 3D en «Ofertas exclusivas para ti» (6 de noviembre de 2026)

A petición del usuario, el icono de línea `Gift` de la tarjeta azul de ofertas
se sustituyó por la **imagen del regalo 3D azul** adjunta:

- El PNG de 1200 × 1200 venía con fondo transparente real (canal alfa), no con
  un fondo negro pintado. Se recortó al contenido útil (971 × 976), se redujo a
  358 × 360 y se guardó como WebP con alfa (~31 KB), conservando los brillos y
  las dos estrellas verde lima.
- El medallón blanco se agrandó de 56 a **76 px** (60 px en móvil) para que la
  ilustración se aprecie; la imagen se ajusta con `object-fit: contain` al 92 %
  del círculo, sin recortes. Se quitó el `color: var(--accent)` del medallón
  porque ya no pinta ningún glifo, y se añadió una sombra suave.
- Es la única imagen de la tarjeta: sigue sin `priority` (solo el hero se
  precarga) y el texto, el botón y el enlace a `/tienda` no cambiaron.
- No se tocó `/tienda`, el carrito compartido ni ningún otro bloque de la
  vitrina.

### Verificación de este ajuste

- `npm run lint`: 0; `npm test`: **150 archivos / 1644 pruebas**, incluidas 6
  nuevas en `tests/catalogo-regalo-ofertas.test.js`; build de producción y
  `ops/verify-static-assets.mjs` correctos.
- Chromium headless local (claro/oscuro 1440 × 900 y móvil 390 × 844): el
  regalo carga sobre el medallón blanco, sin desbordamiento horizontal ni
  errores de consola. **Son comprobaciones y capturas locales**, no
  verificación visual humana ni del despliegue público.

## Vitrina de fabricantes debajo de «Productos destacados»

A petición del usuario, se añadió un bloque parecido al **«Interactive Brand
Showcase»** de la referencia, colocado **después** de la sección «Lo más buscado
/ Productos destacados» y **antes** de las ventajas:

- Título centrado **«Marcas que distribuimos»** con dos flechas circulares a la
  derecha y una fila (`display: flex`, `overflow-x: hidden`) de tarjetas
  blancas con borde redondeado y sombra suave. El desplazamiento lo hacen
  **solo las flechas**; ver la sección siguiente.
- **No se inventaron marcas ni se descargaron logos nuevos**: se reutilizan los
  6 fabricantes que ya declara `app/home-marcas.js` — FiberHome, Sumitomo,
  Lindsay, Joinwit, PBI y Belden — y sus 4 archivos de `public/marcas/*.png`.
  PBI y Belden no tienen logo y se muestran como *wordmark* tipográfico, con el
  mismo criterio que la home (no se dibuja un logotipo falso).
- Las tarjetas son **siempre blancas**, también en tema oscuro: varios logos
  llevan texto negro y desaparecerían sobre la superficie oscura. Es la misma
  placa de legibilidad que usa `app/home-marcas.module.css`.
- Cada tarjeta enlaza a la línea de `/tienda` más afín al fabricante; es un
  acceso al catálogo, **no** un filtro por marca (no existe ese filtro).
- Los 4 logos llevan `loading="eager"` y `unoptimized`: Chromium no dispara el
  *lazy loading* de las imágenes que quedan fuera de un contenedor con scroll
  horizontal, y son PNG pequeños (~50 KB en total). Ninguno lleva `priority`,
  así que el hero sigue siendo la única imagen precargada de la vista.
- No se tocó el regalo 3D de «Ofertas exclusivas para ti», el sobre, el acento
  azul, las filas de productos/ideas, los `301` antiguos, `/tienda` ni el
  carrito compartido.

### Verificación de este ajuste

- `npm run lint`: 0; `npm test`: **151 archivos / 1650 pruebas**, incluidas 6
  nuevas en `tests/catalogo-marcas-showcase.test.js`; build de producción y
  `ops/verify-static-assets.mjs` (17 HTML / 51 assets) correctos.
- Chromium headless local, escritorio 1440 × 900 en claro y oscuro y móvil
  390 × 844: 6 tarjetas, fondo `rgb(255,255,255)` en los tres casos, 4/4 logos
  cargados, fila con `scroll-snap-type: x mandatory` y `scrollWidth` 1624 /
  1302 px en escritorio, la flecha avanza 272 px, el regalo 3D carga, sin
  precios/carrito/corazones, sin desbordamiento horizontal ni errores de
  consola. **Son comprobaciones y capturas locales**, no verificación visual
  humana ni del despliegue público.

## Solo las flechas mueven la fila de marcas

Nota histórica: este cambio se extendió después a productos, ideas y relacionados; ver la sección final.

A petición del usuario, la fila de fabricantes **dejó de desplazarse con el
mouse**: nada de rueda, trackpad ni arrastre; solo los botones ‹ › la mueven.

- `.brandRow` pasó de `overflow-x: auto` a **`overflow-x: hidden`**. El
  elemento sigue siendo un contenedor con scroll (su contenido es más ancho que
  la caja), así que JavaScript puede fijar su `scrollLeft`: es lo que hace
  `desplazarMarcas()` al pulsar cada flecha. Lo que desaparece es el
  desplazamiento por gesto del navegador y la barra de scroll.
- Se quitaron `scrollbar-*`, las reglas `::-webkit-scrollbar*` y
  `overscroll-behavior-x` de esa fila, y se añadió `user-select: none` junto con
  `draggable={false}` en los logos para que no se puedan arrastrar ni
  seleccionar como si fueran desplazables.
- También se retiró el **`scroll-snap` obligatorio** solo de esta fila: con
  `overflow-x: hidden` puede dejar un scroll suave a mitad de camino. Las
  flechas avanzan exactamente el ancho de una tarjeta más el `gap`, así que las
  tarjetas quedan alineadas sin depender del snap. Productos e ideas conservan
  su `scroll-snap-type: x mandatory`.
- Las flechas de marcas usan `desplazarMarcas()` en lugar del `scrollBy`
  acumulativo: miden la tarjeta y el `column-gap` calculado (12 px en escritorio,
  8 px en móvil) y llaman a **`scrollTo` con `behavior: "instant"`** y un
  múltiplo exacto del paso, limitado al `scrollWidth - clientWidth`. Así no
  quedan los 13 px de residuo que dejaba el scroll suave al volver al inicio,
  y la flecha «anterior» regresa por el mismo escalón aunque el último tramo
  sea más corto. Productos e ideas mantienen su `scrollBy` suave.
- **No se interceptan eventos** (`wheel`, `touch`, `pointer`): no hacen falta y
  así el scroll vertical de la página sigue funcionando con normalidad cuando
  el cursor está sobre el bloque.
- Alcance deliberadamente estrecho: **solo la vitrina de marcas**. Las filas de
  «Productos destacados» e «Ideas para tu próxima instalación» conservan su
  `overflow-x: auto`, porque el usuario pidió explícitamente que fueran filas
  deslizantes. El regalo 3D, el sobre, el acento azul, los enlaces, `/tienda`
  y el carrito compartido no se tocaron.

### Verificación de este ajuste

- `npm run lint`: 0; `npm test`: **152 archivos / 1667 pruebas** (incluidas las
  13 de `tests/catalogo-ficha-producto.test.js` y las 2 nuevas de
  `tests/static-assets-contract.test.js`); build de producción y
  `ops/verify-static-assets.mjs` (**23 HTML / 54 assets**) correctos.
- Chromium headless local a 1440 × 900, ya con el build definitivo:
  `overflowX: hidden`, `scroll-snap-type: none` y `gap: 12px`; la rueda
  horizontal sobre la fila **no** cambia `scrollLeft` (0 px) y un arrastre con
  el mouse tampoco. Las flechas integradas van exactamente de **0 → 272 → 0 px**
  (sin el residuo de 13 px que dejaba el scroll suave); con pulsaciones seguidas
  la secuencia es **322 → 272 → 0 → 0 px**, respetando el último tramo más
  corto. La rueda vertical sobre el bloque sí desplaza la página (897 →
  1297 px), las filas de productos e ideas siguen en `overflow-x: auto`, los 4
  logos cargan y no hay desbordamiento ni errores de consola.
- La misma comprobación a 390 × 844 da `gap: 8px`, rueda 0 px, flecha
  **265 px**, vuelta **0 px** y los 4 logos cargados. **Son comprobaciones
  locales**, no verificación visual humana ni del despliegue público.

## Ficha de producto al dar clic en un destacado (9 de noviembre de 2026)

Los 6 «Productos destacados» ya no enlazan a un listado de categoría: cada uno
abre **su propia ficha** en `/catalogo/ficha/[slug]`, con la estructura de la
imagen de referencia adaptada a Arconet. Decisiones confirmadas por el usuario:
ficha nueva dentro de `/catalogo`, todas las secciones de la imagen y alcance
limitado a esos 6 productos (categorías, ideas y marcas siguen igual).

**Por qué `/catalogo/ficha/` y no `/catalogo/producto/`:** `next.config.mjs` ya
tiene un 301 permanente de `/catalogo/producto/:slug` a
`/tienda/producto/:slug`, y las redirecciones se evalúan antes que las páginas.
Quitar ese 301 rompería enlaces guardados a fichas reales de la tienda; la ruta
`/catalogo/ficha/` conserva el 301 y deja las 6 fichas editoriales accesibles.

Contenido de cada ficha:

- Cabecera con logo Arconet, navegación corta y acceso al carrito; ruta de
  navegación (breadcrumb) hasta el equipo.
- **Galería** con imagen principal y 4 miniaturas. Las vistas 2/3/4 son
  **recortes de la misma foto** del equipo (`public/catalogo-vitrina/fichas/`,
  18 WebP), no fotos de otros productos ni colores que no se vendan.
- Línea, título, descripción, «Línea recomendada por instaladores» (adaptación
  de las estrellas, **sin inventar reseñas ni conteos**), **precio de
  referencia** en lempiras con precio anterior en los productos en oferta,
  selector de **presentación** con tres opciones por equipo, cantidad,
  «Comprar ahora» (lleva a `/contacto`) y «Agregar al carrito».
- Tres beneficios (entrega, facturación, soporte), **pestañas** «Descripción»,
  «Especificaciones», «Envío y garantía» y una **tabla de 6 filas × 4 columnas**
  que llega en el primer HTML, como en la referencia.
- **Relacionados**: las otras 5 fichas de la vitrina, priorizando la misma
  línea, con sus flechas ‹ › y desplazamiento controlado por botones (hay recorrido real).

**Naturaleza editorial (importante):** los 6 equipos son contenido ilustrativo
del catálogo, no artículos de la base de datos; la BD de producción contiene
inventario heredado de «Componentes pasivos» con foto genérica. Por eso los
**precios de referencia**, las existencias y las especificaciones se anuncian
como tales en pantalla, y el precio final se confirma con el equipo. «Agregar
al carrito» usa el carrito global de **cotización** (`CartProvider`): añade una
línea local con el nombre y la presentación elegida, sin escribir en la BD ni
llamar a ningún API de compra. `/tienda`, sus fichas reales y su carrito no se
tocaron. La vitrina `/catalogo` sigue **sin precios, carrito ni corazones**;
solo la ficha nueva muestra precio y controles de compra.

La ficha usa el azul `#1544b5`, modo oscuro, cortes a 900/620 px y no añade un
pie de página propio: el componente compartido sigue siendo el único. Tampoco
intercepta `wheel`/`touch` ni se añade al menú global. Las fotos de estudio se
muestran con `object-fit: contain` sobre fondo azul noche para no recortar el
equipo, incluida la única imagen vertical.

**Ajuste necesario en `ops/verify-static-assets.mjs`:** con la primera ruta SSG
con segmento dinámico, el HTML referencia el chunk como
`.../ficha/%5Bslug%5D/page-*.js` mientras que en disco está en
`.../ficha/[slug]/page-*.js`. El verificador comparaba la URL sin decodificar y
bloqueaba un build correcto. Ahora decodifica la ruta (sin salir de
`.next/static`) y `tests/static-assets-contract.test.js` cubre el caso positivo
y el de un chunk ausente. El chunk codificado se sirve con 200 y
`application/javascript`.

### Verificación de la ficha

- HTTP local: las 6 fichas devuelven 200 (≈63 KB de HTML cada una), un slug
  inexistente 404, el 301 heredado `/catalogo/producto/<id>` sigue activo, los
  WebP de galería 200 y el chunk con `%5Bslug%5D` 200 con MIME JavaScript.
- Chromium headless a 1440 × 900: desde `/catalogo` el clic en un destacado
  abre su ficha; la vitrina sigue sin precios; la ficha trae 4 miniaturas,
  imagen principal cargada, 3 pestañas, tabla de **6 filas × 4 columnas**, 5
  relacionados, nota de precios de referencia y 0 px de desbordamiento.
  Interacciones comprobadas: cambiar de vista, cantidad 1 → 2, cambiar de
  presentación, alternar pestañas, «Agregar al carrito» abre el carrito global
  con el equipo, y las flechas de relacionados mueven la fila **2 → 294 px**.
- Modo oscuro (`data-theme="dark"`, fondo `rgb(17,22,29)`) y móvil 390 × 844
  (una columna, tabla con scroll propio, 0 px de desbordamiento) revisados con
  capturas. La única respuesta 503 local es `/api/site-config` al abrir el
  carrito, porque este entorno no tiene PostgreSQL; en producción la BD está
  activa. **Son comprobaciones locales**, no verificación visual humana ni del
  despliegue público.

## Verificación

- `npm run lint`: 0 errores.
- `npm test`: incluye `tests/catalogo-vitrina.test.js`,
  `tests/catalogo-azul.test.js`, `tests/catalogo-fila-deslizante.test.js`,
  `tests/catalogo-categorias-grid.test.js`,
  `tests/catalogo-regalo-ofertas.test.js`,
  `tests/catalogo-marcas-showcase.test.js` y
  `tests/catalogo-ficha-producto.test.js` (ruta, metadatos, assets, enlaces,
  SSR con `renderToStaticMarkup`, imagen prioritaria única, estilos, ausencia
  de precio/carrito/corazón en la vitrina, cuadrícula de categorías, regalo de
  ofertas, vitrina de fabricantes y las 6 fichas de producto).
- Build de producción con `NEXT_DEPLOYMENT_ID`: correcto, sin `?dpl=`;
  `ops/verify-static-assets.mjs`: HTML y assets correctos.
- Con `next start` local: `/catalogo` 200; `/catalogo/categoria/...` y
  `/catalogo/<línea>` 301 a `/tienda/...`; `/tienda`, `/` y `/contacto` 200;
  las fotos de `public/catalogo/` siguen 200; solo se precarga el hero.
- Las capturas con Chromium headless son **verificación local**, no
  verificación visual humana ni del despliegue público. Conviene abrir
  `/catalogo` en PC y en teléfono y hacer `Ctrl+Mayús+R` tras el despliegue.

## Nota de alcance

La página **no** se añadió al menú global ni al footer: el menú 1 de home y
`/tienda` se acaba de igualar en el cambio anterior y añadir un séptimo enlace
los desalinearía. Se accede directamente por `/catalogo`; si se quiere
descubribilidad desde el menú, debe hacerse en los dos sitios a la vez.

## Filas de catálogo controladas por flechas

La corrección posterior extiende el comportamiento de marcas a productos e
ideas y a los relacionados de las fichas. Sus filas usan `overflow-x: hidden`,
sin barra ni `scroll-snap`, y el helper compartido `desplazar-fila.js` mide
el ancho de tarjeta y el `columnGap` real para avanzar o retroceder de forma
instantánea y limitada. No intercepta eventos y los enlaces siguen disponibles
para teclado. Los chips sin flechas y la tabla de especificaciones conservan
su propio desplazamiento para que su contenido siga accesible.

Comprobación local en Chromium a 1440 × 900 y 390 × 844: rueda horizontal,
arrastre del mouse y gesto horizontal en móvil no desplazan las filas; cada
par de flechas avanza y vuelve al inicio, y la rueda vertical sigue desplazando
la página. Sin errores JavaScript. Pruebas unitarias cubren los gaps de 8, 12,
14 y 0 px, límites y referencias vacías.

## Mosaico de ofertas y destacados

Debajo de «Marcas que distribuimos» se muestra un mosaico de siete tarjetas,
inspirado en la referencia: cuatro columnas en escritorio, con una tarjeta
alta de fibra, y dos columnas en móvil. Usa el azul de Arconet, tarjetas oscuras
legibles también en modo oscuro y dos ilustraciones WebP optimizadas. No añade
una fila deslizante: las tarjetas permanecen visibles y accesibles por teclado.

El botón «Ver ofertas» limpia la búsqueda, activa el filtro de ofertas existente
y vuelve a productos. Las tarjetas de OTDR y gabinete enlazan a sus fichas ya
marcadas como oferta; las otras enlazan a categorías existentes o a contacto.
No se anuncian cupones, cashback ni promociones 2×1 que no estén configuradas.
Las ilustraciones son decorativas y no representan fotografías de inventario.

## Buscador y menús de la cabecera

- Al escribir, el buscador muestra sugerencias de los seis productos editoriales
  y los productos disponibles cargados desde la tienda. Acepta mayúsculas y
  búsquedas sin tildes. Enter
  limpia el filtro de línea y muestra las coincidencias en destacados; flecha
  abajo lleva a la primera sugerencia y Escape cierra el panel.
- El botón «Categorías» despliega los filtros existentes de la vitrina. Al
  elegir uno limpia la búsqueda, aplica el filtro y lleva a productos; los
  chips originales y las flechas de las filas se conservan.
- El menú «Mi cuenta» consulta la sesión real de cliente al abrirlo. Para
  invitados ofrece iniciar sesión o registrarse; con sesión activa enlaza al
  portal y permite cerrar sesión con la API existente. Si falla la consulta o
  el cierre, muestra un error sin fingir que la operación tuvo éxito. Los
  menús se cierran al salir del foco o pulsar Escape.
- No se agregaron favoritos, carrito ni seguimiento a la cabecera de la vitrina.

## Grupos de hasta seis elementos

Las secciones de productos, marcas e ideas muestran seis elementos por página:
seis columnas en escritorio, tres en tableta y dos en móvil. Las flechas cambian
el grupo completo y se deshabilitan en los extremos; no hay deslizamiento con
mouse ni controles táctiles que interfieran con el scroll vertical. Al cambiar
filtros se vuelve al primer grupo. Las fichas editoriales y sus relacionados
conservan su comportamiento anterior.

Cada tarjeta de producto lleva la medalla facilitada por el usuario en la
esquina superior izquierda; la etiqueta «Oferta» queda a la derecha para no
solaparse. La medalla es decorativa y no altera el enlace de la ficha.

Los seis productos y marcas originales siguen siendo la primera página. Se
agregan productos con existencias obtenidos de `/api/catalogo`, que enlazan a
sus fichas reales de `/tienda/producto/[id]`; las marcas adicionales se toman
únicamente de esos productos, sin inventar logotipos ni relaciones de
distribución autorizada. Si la API falla, se conserva el contenido original.
El número de marcas adicionales depende del inventario real.

Ideas cuenta con doce tarjetas y siete ideas adicionales; tres usan fotos de
Pexels (ilustrativas, no fotografías del inventario):
[conectores de Brett Sayles](https://www.pexels.com/photo/4373998/),
[servidor de Omar Ashraf](https://www.pexels.com/photo/38246354/) y
[cableado de Brett Sayles](https://www.pexels.com/photo/2881229/). Las fotos
están disponibles bajo la [licencia de Pexels](https://www.pexels.com/license/),
que permite su uso gratuito en sitios web sin exigir atribución. Las secciones históricas
anteriores describen el antiguo scroll y quedan sustituidas por esta.

## Página de todos los destacados

El enlace «Ver todo» de Productos destacados abre `/catalogo/destacados`.
La página muestra todos los seis productos editoriales y los productos con
existencias devueltos por `/api/catalogo`, sin dividirlos en grupos de seis.
Permite buscar por nombre o línea y filtrar por categoría; cada tarjeta abre
la ficha editorial o el producto real de la tienda, respectivamente. El diseño
conserva la medalla y utiliza dos columnas en móvil. Si la API falla, los
productos editoriales siguen visibles y se muestra un aviso, en vez de
presentar el inventario incompleto como si estuviera actualizado.
