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
   que la referencia, pero con el logo de Arconet, líneas y equipos de
   telecomunicaciones y precios en Lempiras.

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
| Cabecera | logo Arconet + lema, buscador funcional, navegación, favoritos, carrito real y acceso |
| Barra de líneas | 7 chips que filtran los productos; idioma/región/moneda |
| Hero | imagen generada con el panel azul en diagonal y el cluster de equipos; 3 destacados con flechas, CTA y círculo «Novedades» |
| Tarjetas de líneas | 5 líneas reales + tarjeta azul de ofertas |
| Productos destacados | 6 equipos con foto, nombre, línea, precio, etiqueta de oferta y corazón (favoritos) |
| Ventajas | envíos, pagos, garantía y soporte |
| Ideas | 5 tarjetas con foto y enlace a líneas reales |
| Ofertas y boletín | tarjeta azul + formulario de correo |
| Cierre | 4 promesas y «Síguenos», más el `<Footer />` compartido |

### Funcionalidad real, no maqueta

- El **buscador** y los **chips** filtran la cuadrícula de productos en cliente
  (y hay estado vacío con botón para limpiar).
- **Favoritos**: corazón con `aria-pressed` y contador; el icono de la cabecera
  lleva a la vista de favoritos.
- **Carrito**: el botón de la cabecera abre el `CartDrawer` real con el contador
  del `CartProvider`.
- **Flechas del hero** cambian entre tres destacados.
- **Boletín**: `<form action="/contacto" method="get">` con `name="correo"`.
  No hay endpoint de suscripciones; en vez de fingir un alta, el formulario
  lleva a Contacto con el correo como parámetro.
- Cada tarjeta enlaza a una línea real de `/tienda/categoria/...`.

### Imágenes

- `public/catalogo-vitrina/hero-banner.jpg` (~70 KB): generada para esta
  vitrina, con el panel azul diagonal y los equipos de fibra óptica, sin texto
  (el texto va en HTML). Es la única imagen con `priority` de la vista.
- Las demás son fotos que ya estaban en el repo: `public/catalogo/prod-*.jpg`
  para productos, `public/catalogo/lineas/cards/*.webp` para las líneas y
  `public/catalogo/sol-*.jpg` / `infraestructura.jpg` / `hero-fiber.jpg` para
  las ideas. No se descargaron fotos de terceros.
- El logo cumple el contrato de rendimiento: `sizes="132px"`,
  `loading="eager"` y `fetchPriority="low"` (React 19 no lo precarga).

## Estilos y compatibilidad

- `app/catalogo/catalogo-experience.module.css` define variables locales
  (`--accent`, `--accent-ink`, `--surface`, `--soft`, …) con variante para
  `html[data-theme="dark"]`. El hero mantiene sus colores claros porque es una
  fotografía.
- Cortes en 1180, 900, 620 y 400 px: la cuadrícula de 6 baja a 3/2 columnas,
  la navegación se oculta en tablet, el buscador pasa a su propia fila en
  teléfono y el hero usa un velo degradado para que el texto siga legible.
- Solo hay transiciones de `hover`, sin `@keyframes`: el contrato global de
  `tests/animaciones-siempre-activas.test.js` enumera los únicos CSS con bloque
  `prefers-reduced-motion`, y esta vista no añade ninguno.

## Acento azul (6 de noviembre de 2026)

A petición del usuario, la vitrina dejó de usar el rojo de la referencia y pasó
al **azul de marca `#1544b5`**, el mismo de home y `/tienda`:

- `--accent: #1544b5` para fondos y botones, con `--accent-dark: #11358f` para
  el hover; la sombra del sobre pasó a `rgba(21, 68, 181, 0.9)`.
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

No se cambió la estructura, los textos, los enlaces, los precios ni `/tienda`.

### Verificación de este ajuste

- `npm run lint`: 0; `npm test`: **147 archivos / 1624 pruebas** (6 nuevas en
  `tests/catalogo-azul.test.js`); build de producción y
  `ops/verify-static-assets.mjs` correctos.
- Chromium headless local a 1440 × 900, temas claro y oscuro: capturas del hero
  y del bloque de ofertas/boletín, `--accent: #1544b5` en ambos,
  `--accent-ink: #1544b5` / `#7fa6ff`, precio `rgb(21, 68, 181)` /
  `rgb(127, 166, 255)`, sin errores de consola ni desbordamiento horizontal.
  **Es verificación en navegador local, no en el despliegue público ni en
  dispositivos físicos.**

## Verificación

- `npm run lint`: 0 errores.
- `npm test`: **144 archivos / 1604 pruebas** en verde, incluidas 13 nuevas en
  `tests/catalogo-vitrina.test.js` (ruta, metadatos, assets, enlaces, SSR con
  `renderToStaticMarkup`, imagen prioritaria única y estilos).
- Build de producción con `NEXT_DEPLOYMENT_ID`: correcto, sin `?dpl=`;
  `ops/verify-static-assets.mjs`: 17 HTML y 51 assets correctos.
- Con `next start` local: `/catalogo` 200; `/catalogo/categoria/...` y
  `/catalogo/<línea>` 301 a `/tienda/...`; `/tienda`, `/` y `/contacto` 200;
  las fotos de `public/catalogo/` siguen 200; solo se precarga el hero.
- **No hay verificación visual en navegador**: en este entorno no hay
  Chromium/Brave/Firefox ni jsdom/happy-dom. Conviene abrir `/catalogo` en PC
  y en teléfono y hacer `Ctrl+Mayús+R` tras el despliegue.

## Nota de alcance

La página **no** se añadió al menú global ni al footer: el menú 1 de home y
`/tienda` se acaba de igualar en el cambio anterior y añadir un séptimo enlace
los desalinearía. Se accede directamente por `/catalogo`; si se quiere
descubribilidad desde el menú, debe hacerse en los dos sitios a la vez.
