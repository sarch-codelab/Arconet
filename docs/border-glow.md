# BorderGlow global

Adaptación de React Bits BorderGlow (JavaScript + CSS, MIT + Commons Clause; licencia conservada junto al componente). No requiere dependencias nuevas.

## Integración

- `app/layout.js` monta `SiteBorderGlow` una sola vez.
- `lib/card-glow-targets.js` reconoce superficies CSS Modules llamadas `card`, `metric`, `quoteInner` o terminadas en `Card`, tanto en desarrollo como en producción. No selecciona cabeceras, cuerpos o rejillas plurales.
- Las superficies con nombres distintos pueden declararse con `data-border-glow=""`. El panel de Monica IA lo usa explícitamente. También se reconocen los marcadores existentes `data-card-reveal`.
- `data-border-glow="off"` excluye una superficie y sus descendientes al detectarlos. Los elementos reemplazados, SVG, controles de formulario y estructuras de tabla no se decoran.
- Un MutationObserver incorpora tarjetas insertadas por navegación SPA, filtros o cambios de sección y libera las retiradas. Las superficies futuras con otros nombres deben usar el marcador explícito.

Se añade una capa absoluta decorativa, `aria-hidden` y sin eventos, sin envolver ni sustituir el contenido existente. No se cambian fondos, imágenes, sombras, transformaciones, recortes o animaciones de texto. Si la superficie era estática se posiciona relativamente; la limpieza restaura los estilos anteriores. El relleno global es cero para no teñir textos ni imágenes. Los contenedores con overflow oculto conservan ese recorte, incluyendo el del halo exterior.

## Interacción y rendimiento

El borde multicolor aumenta al acercar el ratón a los extremos y el halo sigue su dirección. Se emplean un manejador de puntero delegado y un RAF bajo demanda, con una lectura del rectángulo de la tarjeta activa por cuadro. No hay animación continua global. Salir, cambiar de pestaña, perder foco de ventana, desplazar o redimensionar restablece el realce del puntero.

El foco de un control dentro de una tarjeta también ilumina el borde, sin sustituir su indicador de foco nativo. En pantallas táctiles no se simula hover; el foco continúa disponible. Movimiento reducido mantiene el efecto con menor intensidad y una transición más corta. Impresión y colores forzados omiten la decoración.

## Componente reutilizable

`components/ui/border-glow/border-glow.js` exporta `BorderGlow` para nuevas superficies. Admite `children`, `className`, `edgeSensitivity`, `glowColor`, `backgroundColor`, `borderRadius`, `glowRadius`, `glowIntensity`, `coneSpread`, `animated`, `colors` y `fillOpacity`. Comparte dibujo y utilidades con el controlador global y evita doble decoración. `animated` es falso por defecto; el barrido opcional inicial se reduce con la preferencia de movimiento reducido y se detiene si la página se oculta.

## Validación local

- ESLint sin advertencias; 116 archivos y 1416 pruebas aprobados; compilación de producción aprobada.
- Navegador Chromium: inicio, tienda y acceso administrativo en claro/oscuro y movimiento normal/reducido. Borde visible en los extremos, una capa por superficie, fondo/texto conservados, controles nativos utilizables y sin desbordamiento horizontal.
- Pantalla táctil de 390 px: inicio, tienda y acceso administrativo sin desbordamiento; foco de tarjeta de tienda visible.
- Sesión administrativa local: métricas del resumen y tarjeta de Monica IA incorporada al cambiar de sección.
- Servidor de producción: detección con clases CSS minificadas, inicio/tienda/acceso, navegación SPA inicio → tienda → atrás y tarjeta insertada dinámicamente, sin errores de página.
- El catálogo local de la categoría consultada no contenía referencias; no se presenta esa comprobación como una prueba visual de productos reales.

Son validaciones locales con navegador automatizado, no de dispositivos físicos ni del despliegue público. No se ha fusionado ni publicado este cambio.

## Exclusión de Monica IA

Por petición posterior, el cuadro completo de Monica IA tiene `data-border-glow="off"`. El efecto continúa en las demás tarjetas; el chat conserva únicamente sus bordes estáticos y los indicadores de foco accesibles.
