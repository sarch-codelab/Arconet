# Suavizado del recorrido de las cuatro imágenes de Soluciones — 6 de noviembre de 2026

## Reporte atendido

En la página de inicio, la sección con las cuatro imágenes deslizantes se sentía
«dura», «bugueada» o «trabada» al desplazarse con la rueda. **Se conserva el
comportamiento pedido: las imágenes siguen deslizándose ligadas al scroll**, sin
convertir la sección en un carrusel de botones ni quitar el `position: sticky`.

## Diagnóstico

La auditoría de rendimiento de `docs/rendimiento-scroll-2026-11-03.md` ya había
retirado Locomotive/Lenis y dejado el scroll nativo. Quedaban cuatro causas que
no se habían tocado:

1. **Salto de altura al hidratar.** La clase `scrollReady` (la que aplica
   `height: 400svh` y el `sticky`) se activaba con `setScrollReady(true)` desde
   el primer RAF. En Chromium a 1440 × 900, `document.documentElement.scrollHeight`
   pasaba de **10 504 px en `load` a 13 232 px tras hidratar**: +2 728 px de golpe,
   justo en el primer gesto de scroll. Ese cambio además disparaba el
   `ResizeObserver` de `lib/native-scroll.js`, que vuelve a medir todas las
   secciones con lecturas de geometría forzadas.
2. **Variable CSS heredada escrita en cada fotograma.** El scroll publicaba
   `--slide-progress` con `stage.style.setProperty(...)` en el `<section>`.
   Las custom properties se heredan: cada fotograma invalidaba el estilo de los
   cuatro paneles completos (fotos a pantalla completa, video, degradados,
   titulares) dentro de una pista de `400vw`, y obligaba a repintar esa
   superficie. Lo mismo ocurría con `--zoom-progress` escrito en el hero entero,
   incluyendo menú y logo.
3. **Saltos secos por la rueda.** El transform era exactamente proporcional a
   `scrollY`. Una rueda de ratón avanza a muescas discretas; en la medición se
   observaron saltos de hasta **288 px** entre fotogramas consecutivos y solo
   **17 posiciones distintas** en todo el recorrido de 18 muescas. Eso es lo que
   se percibe como «trabada / bugueada».
4. **Trabajo decorativo compitiendo con el scroll.** `SiteFlickeringGrid`
   mantenía su bucle de canvas durante el desplazamiento: cada `draw()` hace un
   `getBoundingClientRect()` y miles de `fillRect()` en el hilo principal. Además
   el panel 04 aplicaba un `backdrop-filter: blur(2px)` dentro de la pista en
   movimiento, apenas visible sobre un fondo ya casi opaco.

## Cambios

- `app/home-experience.js`: la clase `scrollReady` va en el HTML del servidor, ya
  no en un estado de React. Se elimina `setScrollReady` y el cambio de altura
  posterior a la hidratación.
- `lib/slide-easing.js` (nuevo): interpolador corto con RAF bajo demanda. El
  scroll sigue siendo 100 % nativo (sin `preventDefault`, sin listeners de
  `wheel`/`touch`), pero el transform decorativo alcanza su objetivo con una
  constante de ~90 ms y **se detiene solo cuando converge**. Con
  `prefers-reduced-motion: reduce` o pestaña oculta aplica el valor de golpe.
- El transform se escribe **directamente en la pista** (`track.style.transform`),
  no como custom property en el ancestor. El zoom del hero se escribe en el
  contenedor de la foto (`heroMediaRef`), que solo tiene dos hijos.
- Puntos y encabezados se alinean con el panel visible usando
  `Math.round(progress * (SOLUTIONS.length - 1))`, el mismo mapeo que ya usaba
  `goToSlide`; antes `floor(progress * 4)` podía mostrar el título de un panel
  mientras la pista estaba a mitad de camino.
- En móvil se limpia el transform en línea y se reinicia el interpolador, para
  que el carrusel horizontal nativo con `scroll-snap` siga intacto.
- `app/site-flickering-grid.js`: suspende el dibujo de los lienzos mientras hay
  scroll y lo retoma 180 ms después del último evento, sin acumular un delta
  gigante. Se libera el temporizador y el listener al desmontar.
- `app/page.module.css`: se retira el `backdrop-filter` del panel 04 y se documenta
  que la regla `translate3d(calc(var(--slide-progress, 0) * -75%))` es solo el
  estado inicial antes de hidratar (el transform en línea la sustituye).

No se cambiaron imágenes, textos, enlaces, temas, carritos ni las demás rutas.

## Medición A/B en Chromium headless

Base: `git archive HEAD` (commit `44f9f7b`), compilada por separado en
`.local/base` con las mismas dependencias. Ambas versiones servidas con
`next start`, viewport 1440 × 900, **CPU emulada a 4×**, tres repeticiones por
variante. Se sitúa la página 60 px antes de `#soluciones`, se ejecutan 18 ruedas
de 180 px separadas 100 ms y se espera 1 200 ms. Se informa la **mediana** de las
métricas CDP `Performance.getMetrics` y de un muestreador del transform de la
pista por RAF. Es trabajo acumulado del hilo principal, **no FPS ni una garantía
sobre el equipo del jefe**.

| Métrica | Antes | Después | Cambio |
| --- | ---: | ---: | ---: |
| `TaskDuration` (ms) | 2 800 | 1 979 | −29 % |
| `ScriptDuration` (ms) | 999 | 344 | −66 % |
| Posiciones distintas de la pista | 17 | 82 | ×4,8 |
| Salto máximo entre fotogramas (px) | 288 | 173 | −40 % |
| Salto medio entre fotogramas (px) | 71 | 50 | −30 % |
| `LayoutCount` | 22 | 38 | +16 |
| `RecalcStyleCount` | 119 | 196 | +77 |

Los recuentos de layout/recalc **no mejoraron**: hay más fotogramas (71–93 frente
a 54–64) y el muestreador lee `getComputedStyle` en cada uno, lo que fuerza
recalculos; el trabajo total y el de script bajan claramente. No se afirma
eliminar todo layout ni toda carga gráfica.

Comprobación funcional en Chromium a 1440 y 390 px:

- Altura del documento estable desde `DOMContentLoaded`: **13 454 → 13 232 px**
  (variación de ~1,6 % por fuentes/imágenes). Antes: 10 719 → 13 232 px.
- Sin errores de página ni de consola, sin desbordamiento horizontal en ningún
  ancho, sin errores de hidratación.
- Escritorio: la pista pasa de `translate3d(0%, …)` a `translate3d(-33.28%, …)`
  al avanzar 1 200 px dentro de la sección. Móvil: `transform: none` y carrusel
  horizontal nativo sin cambios.

## Validación del repositorio

- `npm run lint` sin advertencias.
- `npm test`: **146 archivos / 1618 pruebas** pasando (14 pruebas nuevas entre
  `tests/slide-easing.test.js`, `tests/home-soluciones-scroll-suave.test.js` y
  `tests/flickering-grid.test.js`).
- `node ops/verify-static-assets.mjs`: 17 HTML y 51 assets referenciados.
- Rutas locales con `next start`: `/`, `/tienda`, `/catalogo` y `/contacto` en 200;
  el HTML de inicio ya trae la clase `scrollReady` desde el servidor.
- Build de producción con `DATABASE_URL` y `NEXT_DEPLOYMENT_ID` de prueba.
- Pruebas de regresión que protegen: scroll nativo sin interceptar rueda, ausencia
  de `setProperty("--slide-progress")`, transform escrito en la pista, zoom en la
  foto, clase `scrollReady` en el servidor, bucle que se apaga en reposo, respeto
  a movimiento reducido, carrusel móvil, alineación de puntos/encabezados y pausa
  de los lienzos durante el scroll.

## Límites

La medición usa Chromium headless con CPU emulada y fallback de catálogo sin base
de datos real; no equivale a probar la PC, la rueda, el trackpad, los
controladores ni las extensiones del jefe. El muestreador por RAF añade trabajo
a ambas variantes. **Recomendación: probar en ese equipo después del despliegue**;
si persistiera, conviene tomar una traza de Performance allí para separar
pintura/GPU, extensiones y carga de red antes de añadir otra capa de animación.
