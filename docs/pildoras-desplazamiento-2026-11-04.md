# Desplazamiento de las píldoras del panel — 4 de noviembre de 2026

## Qué se reportó

«No funcionan las píldoras en el panel administrativo, lo que es el desplazamiento.»

## Causa

Las dos filas de píldoras del panel —las secciones de la cabecera
(`.centerPillNav`) y las sub-secciones de cada área (`.sectionTabs`)— tienen
`overflow-x: auto`, porque no siempre caben:

| Ancho de ventana | Píldoras de sección | Resultado |
| --- | --- | --- |
| 1920–1400 px | 786–842 px | caben |
| 1366 px | 786 px en 768 px | **18 px fuera** (última píldora cortada) |
| 1280 px | 786 px en 682 px | **104 px fuera** (dos píldoras inalcanzables) |
| 1180 px | fila en línea propia | caben |
| 390 px | 696 px en 362 px | **334 px fuera** (casi la mitad de la fila) |

La fila se podía deslizar con el dedo (desplazamiento nativo) y con Shift +
rueda, pero no con un mouse común:

- La rueda vertical movía la página, nunca la fila.
- Arrastrar con el botón izquierdo sobre las píldoras no hacía nada.

En 1366 px —una resolución de portátil muy común— la última píldora quedaba
cortada, y en 1280 px había dos secciones que no se podían alcanzar con el
mouse. El ajuste automático a la píldora activa (`scrollIntoView`) sí
funcionaba, pero solo después de pulsar una píldora visible.

El `scroll-snap` de la fila agravaba el problema: al intentar moverla, el
navegador devolvía la fila a la primera píldora al terminar el gesto.

## Cambios

- **`app/admin/pill-scroll.js` (nuevo).** Un solo gesto compartido por todas
  las filas de píldoras:
  - Rueda vertical sobre una fila que desborda → desplazamiento horizontal.
    Al llegar a un extremo la rueda vuelve a mover la página (no se queda
    atrapada en la cabecera).
  - Arrastre con el botón principal del mouse, con umbral de 5 px para
    distinguirlo de un clic; al soltar tras un arrastre real se cancela el
    clic que emite el navegador, así que no se cambia de sección sin querer.
  - Solo con `pointerType === "mouse"`: el dedo y el lápiz conservan el
    deslice nativo. Tampoco se instala nada si la fila cabe entera.
  - Los puntos de anclaje se suspenden durante el gesto y se restauran al
    soltar.
  - El hook usa un ref de callback, así que funciona aunque la fila se monte
    después del primer render.
- **`app/admin/topbar.js`.** `useActivePillIntoView` conecta el gesto tanto a
  la barra de secciones como a `SectionTabs` (Inventario, Ventas, Logs,
  Monitoreo, Ajustes, Mi perfil, Resumen…).
- **`app/admin/solicitudes-panel.js`.** Los filtros de estado de Órdenes
  internas (misma fila de píldoras con desplazamiento horizontal) usan el
  gesto.
- **CSS.** Cuando la fila desborda se marca con `data-pill-overflow` y muestra
  cursor `grab`/`grabbing`; al arrastrar no se selecciona el texto. Los
  `scroll-snap` quedan limitados a `@media (pointer: coarse)` para no pelear
  con la rueda y el arrastre del mouse.

## Verificación

- Chromium (vía `@sparticuz/chromium` y un servidor de desarrollo local con un
  componente de prueba temporal, retirado antes de cerrar el cambio):
  - 1280 px: la rueda mueve la fila hasta el final (104/104) sin mover la
    página; al llegar al extremo, la siguiente rueda sí desplaza la página.
  - 390 px: rueda (200 → 334), arrastre (144) y sub-píldoras (132).
  - 1440 px sin desborde: la rueda mueve la página y el cursor sigue normal.
  - Tras un arrastre no se cambia de sección; un clic normal inmediatamente
    después sí la cambia.
  - Dedo (eventos táctiles reales): el deslice sigue siendo nativo y el toque
    en una píldora abre su sección.
- `npm test`: **1510 pruebas**, 127 archivos (14 nuevas en
  `tests/admin-pill-scroll.test.js`).
- `npm run lint`: sin errores ni advertencias.
- `next build --webpack`: compilación y tipos correctos. En este entorno no se
  pudo ejecutar `prisma generate` (sin acceso a `binaries.prisma.sh`); el
  cliente se sustituyó por un stub local no versionado solo para compilar.

## Límites

No se probó con una sesión administrativa real contra PostgreSQL: la
verificación se hizo con el componente de cabecera y las filas de píldoras
reales sobre datos simulados. Falta confirmar en el equipo del usuario, sobre
todo a 1366 px de ancho, que la rueda y el arrastre se sienten bien con su
mouse o trackpad.
