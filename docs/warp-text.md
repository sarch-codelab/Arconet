# WarpText en la home

## Ubicación elegida

La cita «No vendemos solo equipo: ayudamos a que cada conexión funcione.», justo antes de Contacto. Es un bloque independiente con espacio y contraste, adecuado para una distorsión de vidrio sin recargar la portada ni las tarjetas.

No se cambia el contenido ni la imagen de fondo. Se conserva `data-reveal` en el blockquote y todos los `data-split` de los títulos, incluidos el hero y «Hagamos que todo conecte». No se aplica WarpText a textos pequeños, enlaces o navegación.

## Implementación

- `app/home-warp-quote.js`: HTML legible desde SSR y carga dinámica cerca del viewport (250 px), sin OGL en la carga inicial de la home.
- `components/ui/warp-text/warp-text.js`: adaptación JavaScript + CSS de React Bits, con shaders WebGL2/OGL, lente bulge, refracción cromática leve, ondulación ambiental y ondas al pulsar.
- Tipografía y color heredados de la cita; el texto rasterizado se ajusta y divide por palabras, también en móvil.
- El HTML reserva la altura y permanece como alternativa accesible. Sólo se oculta visualmente tras dibujar la textura. Sin WebGL2 o ante pérdida de contexto, se mantiene el texto original; sin JavaScript se muestra igualmente.
- Sin introducción adicional: se conserva la entrada existente del bloque en lugar de sustituirla por otro revelado.
- DPR hasta 1.5, sin antialias adicional, aproximadamente 30 fps; con movimiento reducido, unos 12 fps y menor intensidad/velocidad, sin apagar el efecto.
- Pausa fuera del viewport y con la pestaña oculta, sin saltos de tiempo al volver. Actualización por resize, fuentes y cambio de tema; limpieza de eventos, observadores, programa, geometría, textura y contexto.
- Se corrige el `smoothstep` invertido del shader proporcionado.

## Procedencia y licencia

React Bits, David Haz: https://github.com/DavidHDev/react-bits/tree/main/src/content/TextAnimations/WarpText . Se conserva la licencia upstream **MIT + Commons Clause**, no MIT sin condiciones, en `components/ui/warp-text/LICENSE`. La dependencia `ogl` conserva su licencia propia. Las modificaciones locales están descritas arriba.

## Validación

Lint, suite completa y build. Chromium 1440/390 px, claro/oscuro, movimiento normal/reducido: carga diferida, animación por comparación de capturas, hover/clic, tema, pérdida de contexto, alternativa sin WebGL y ausencia de overflow. Capturas en `.local/visual/warp-*`, fuera de Git. No se ha probado en un dispositivo físico ni desplegado en producción.
