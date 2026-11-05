# Texto del hero de /contacto a la izquierda y con la tipografía de /tienda

El bloque «Arconet · San Pedro Sula, Honduras / Tu próximo proyecto empieza con una conversación. / Cuéntanos qué quieres conectar…» estaba centrado (`text-align: center`, `margin: auto`, ancho de hasta 1240px) sobre la foto de asesoría. Al ocupar el centro tapaba a las dos personas de la imagen. Además, su `h1` usaba Exo 2 (`--font-heading`) a 74px con peso 400, mientras el hero del home de `/tienda` usa Orbitron (`--font-display`) en peso 700 con otro ritmo de tamaño, interlineado y sombra.

## Cambios (sólo CSS de `/contacto`)

- El bloque pasa a una columna izquierda de `min(880px, 52%)`, con `margin-left: clamp(24px, 6vw, 116px)` y `text-align: left`. El `eyebrow` deja de centrarse y el párrafo y el botón dejan de usar márgenes automáticos.
- El degradado horizontal se refuerza en el lado de lectura y se apaga al 76% (`rgba(5, 14, 28, 0)`), protegiendo la legibilidad sin oscurecer a las personas del centro y la derecha. Se conserva el degradado vertical original para cabecera y pie.
- Tipografía **idéntica a la del hero de `/tienda`**: `font-family: var(--font-display)`, `clamp(32px, 3.6vw, 64px)`, peso 700, `line-height: 1.08`, `letter-spacing: -0.025em`, sombra de texto, `text-wrap: balance`, `overflow-wrap: anywhere`, y color de énfasis `#c7ddff`. El `eyebrow` y el párrafo también adoptan los tamaños, interlineados, colores y sombras de `/tienda` (`.heroContent .eyebrow` y `.heroDescription`). El párrafo se limita a `46ch` para no invadir la foto.
- En móvil (≤760px): columna de `calc(100% - 40px)` con `margin-inline: 20px`, tamaños `clamp(28px, 6.6vw, 44px)` y degradado propio. El bloque se desplaza hacia la parte baja de la tarjeta y la foto se encuadra con `object-position: 64% 42%`, de modo que los rostros quedan visibles por encima del texto. Se retira el antiguo ajuste de 40px para 390px.
- Sin cambios en la imagen `/contacto-asesoria-fibra.webp`, los textos, los enlaces, la CTA, la navegación, el formulario, las secciones siguientes, los temas, el progreso de scroll ni la animación `copyEnter` y sus `@keyframes`.

## Validación local

ESLint, **135 archivos / 1549 pruebas** y compilación de producción Webpack aprobados. Chromium sobre el build de producción: **20 escenarios** (1920×1080, 1440×900, 900×700, 390×844 y 320×568 × claro/oscuro × movimiento normal/reducido).

En cada escenario se compararon los estilos calculados del `h1`, `eyebrow` y párrafo de `/contacto` con los del hero de `/tienda` (familia, tamaño, peso, interlineado, espaciado y sombra): idénticos. Se comprobó además alineación izquierda, columna terminando antes del 62% de la tarjeta en escritorio, todos los elementos del bloque dentro de la columna y de la tarjeta, sin overflow horizontal, `animation-name` distinto de `none`, opacidad final 1, imagen decodificada, formulario presente, degradado transparente a la derecha y ausencia de errores JS. Capturas de escritorio y móvil inspeccionadas en ambos temas.

## Límites

No se probó Safari/Brave ni dispositivos físicos o zoom real. No se verificó el despliegue en el servidor Windows ni el dominio público: la fusión del PR no equivale a que `arconethn.com` esté sirviendo este build.
