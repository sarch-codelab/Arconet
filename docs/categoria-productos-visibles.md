# Por qué una categoría parecía no mostrar productos

## Síntoma

`https://arconethn.com/tienda/categoria/componentes-pasivos` abría con el
encabezado y el contador **50 productos**, pero el listado de tarjetas no se
veía en el navegador. No era un problema de datos:

- `/api/catalogo` devuelve las 50 referencias de `Componentes pasivos` con SKU,
  precio, stock y foto.
- El HTML/DOM de la página contiene las 50 tarjetas con sus enlaces a
  `/tienda/producto/...`.

Es decir, los productos **estaban**, pero no se **pintaban**.

## Causa

`app/tienda/categoria/[slug]/category-products.module.css` era el único CSS del
sitio que escondía el contenido en la clase base del revelado:

```css
.reveal { opacity: 0; transform: translateY(30px); transition: ... }
.revealVisible { opacity: 1; transform: translateY(0); }
```

La clase solo la añadía un `IntersectionObserver` creado en un `useEffect` con
`threshold: 0.12`. Dos condiciones dejaban la sección invisible para siempre:

1. **Sección más alta que el viewport.** Con 50 tarjetas, el área visible de la
   sección nunca alcanza el 12 % de su propia altura (en móvil, con una sola
   columna, es ~3 %). El observador entrega el aviso inicial fuera de pantalla
   y luego no vuelve a cruzar el umbral, así que `revealVisible` no se aplica.
   En categorías cortas sí se alcanzaba el 12 % y por eso el fallo parecía
   aleatorio.
2. **Cualquier fallo de hidratación.** Si un chunk viejo, un bloqueador o un
   error de JS impedía montar el efecto, tampoco existía el observador. El
   sitio ya había tenido `ChunkLoadError` y `net::ERR_BLOCKED_BY_CLIENT` en la
   tienda.

Además, el listado dependía por completo de un `fetch("/api/catalogo")` después
de hidratar: el HTML inicial solo decía *Cargando productos...* y, si la
petición fallaba, el `catch` ponía `products = []` y vaciaba la página.

El resto del sitio (home, `/contacto`, `/terminos`, detalle de producto) ya usa
el patrón seguro: clase base **visible** + animación `both` que termina en
`opacity: 1` al añadir la clase. La categoría era la excepción.

## Arreglo

- **CSS:** `.reveal` ahora es `opacity: 1; transform: none`. `.revealVisible`
  dispara `@keyframes categoryRevealUp` (600 ms, `both`) que termina visible.
  El revelado vuelve a ser un adorno, nunca un requisito para ver el contenido.
- **Observador:** `threshold: 0` para que avise en cuanto un píxel entre en
  pantalla, y si no existe `IntersectionObserver` se aplica el estado final
  directamente.
- **Datos en el servidor:** `app/tienda/categoria/[slug]/page.js` consulta los
  productos activos con Prisma, normaliza nombre/slug igual que el cliente,
  convierte `Decimal` a número y sustituye fotos `data:` por su ruta
  `/api/productos/[id]/foto`, y pasa `productosIniciales` al componente
  cliente. Las tarjetas salen en el primer HTML.
- **Refresco sin borrar:** `useCatalogProducts(productosIniciales)` arranca con
  ese listado; si `/api/catalogo` responde mal o un bloqueador corta la
  petición, se **conservan** los productos ya visibles en lugar de hacer
  `setProducts([])`.
- **Estado de carga:** *Cargando productos...* solo aparece cuando no hay
  ninguna tarjeta que mostrar; con datos del servidor se pinta el grid aunque
  el refresco siga en vuelo.

## Verificación

- `npm run lint` sin avisos, `npm test` completo (141 archivos / 1579 pruebas).
- `tests/categoria-productos-visibles.test.js`: contrato de CSS, umbral,
  fallback y datos del servidor.
- `tests/categoria-ssr-productos.test.js`: render real con
  `react-dom/server`; comprueba que nombre, SKU, contador, *Agotado* y
  *Añadir al Carrito* salen en el HTML inicial sin hidratación.
- `npm run build` con `NEXT_DEPLOYMENT_ID=test-deploy-123`: sin `?dpl=`,
  `ops/verify-static-assets.mjs` OK, los 193 `.js` de
  `.next/static/chunks` responden 200 con MIME JavaScript y tamaño correcto.
- CSS compilado servido por `next start`:
  `.category-products_reveal__IB4nH{opacity:1;transform:none}` y
  `@keyframes ...categoryRevealUp...{0%{opacity:0;...}to{opacity:1;...}}`.

> Nota: `AGENTS.md` pide comprobar animaciones en navegador con
> `prefers-reduced-motion: reduce` y `no-preference`. En este entorno no hay
> Brave/Chromium disponible; la comprobación equivalente se hizo sobre el CSS
> compilado y el render del servidor. La regla no añade ningún
> `@media (prefers-reduced-motion)`, igual que el resto del sitio, así que el
> estado final visible no depende de esa preferencia.

## Categorías: empezar por productos

Las páginas `/tienda/categoria/[slug]` ya no muestran la portada con imagen y
texto de la categoría. Mantienen el menú fijo y las migas para orientarse; el
primer bloque de contenido es «Productos disponibles» como `h1`, seguido por
los filtros, el listado, soporte y footer existentes. La información de la
categoría sigue disponible para metadatos y coincidencia de productos, sin
pasar foto ni descripción al componente cliente. No se modifican las fichas de
productos ni las páginas de familia `/tienda/[slug]`.
