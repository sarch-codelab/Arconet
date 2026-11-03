# Rendimiento del desplazamiento — 3 de noviembre de 2026

## Diagnóstico y decisión

Se auditó el código compartido y las rutas públicas de inicio, tienda, categoría, detalle de línea, producto, contacto y términos, además del controlador de scroll del panel y el menú móvil.

Las páginas públicas cancelaban la rueda mediante Locomotive/Lenis para interpolar el desplazamiento. El panel y términos usaban Lenis directamente. Esto añadía un bucle JavaScript incluso en reposo y hacía depender la respuesta de la rueda del hilo principal. En inicio coexistían dos suscripciones de scroll, lecturas geométricas intercaladas con escrituras y despachos frecuentes a React.

No se añadió otra biblioteca de animación. Se usaron capacidades del navegador ya disponibles: desplazamiento nativo, eventos pasivos, RAF bajo demanda, ResizeObserver e IntersectionObserver. React `cache` deduplica por solicitud la lectura de categoría/producto compartida entre metadata y página; no es una caché persistente ni retrasa cambios del administrador.

## Cambios

- `lib/native-scroll.js` comparte progreso y navegación programática sin escuchar ni cancelar wheel/touch/teclado. Agrupa eventos en un fotograma y no renueva RAF en reposo. Mide límites al montar/cambiar dimensiones, observa el contenido y cancela trabajo pendiente al desmontar.
- Inicio mide geometría junta, fuera del callback de scroll. Solo actualiza React al cambiar sección, slide o umbral del dock. Se conserva la separación entre carrusel móvil horizontal y recorrido de escritorio.
- Tienda, categorías, ambos detalles, contacto, términos y panel usan el observador nativo. Se retiraron Lenis, Locomotive y su CSS. Se eliminó la corrección forzada de `scrollX` de categoría; el desplazamiento horizontal del documento permanece contenido por CSS.
- Los títulos mantienen sus transiciones originales, sin solicitar una capa GPU permanente para cada palabra. La foto del hero sigue siendo la misma; su calidad se normaliza al valor 75 admitido por la configuración de Next Image.
- El menú móvil agrupa mediciones de posición y escucha scroll pasivamente, únicamente mientras está abierto.
- Los videos decorativos no tienen autoplay HTML que se adelante al observador. Solo intentan reproducirse visibles y con pestaña activa; se pausan al salir, ocultar la pestaña o desmontar. Al volver a la pestaña no se reactivan fuera de pantalla. Se conserva metadata/poster y el modo de ahorro de datos.
- El panel conserva el bloqueo del fondo mediante `useBodyScrollLock`, el scroll interno y el arrastre de diálogos. Al cerrar se refresca el progreso del documento. Los marcadores `data-lenis-prevent` restantes son legados inertes, no una dependencia.

Se conservaron contenidos, imágenes originales, temas, enlaces, carritos, carruseles y revelados de texto. Las animaciones siguen funcionando con `prefers-reduced-motion: reduce`; no se añadió una regla global que las apague.

## Comparación local con compilaciones de producción

Base: commit `c230ad57ce241fe12dc9142baf3d6435ba5b2098`. La base se extrajo con `git archive` a una carpeta ignorada, sin cambiar de rama. Ambas versiones se instalaron y compilaron por separado y se sirvieron con `next start`.

Chromium headless, viewport 1440 × 900, CPU emulada a 4×, tres repeticiones por ruta/versión. Cada muestra espera hidratación/entradas iniciales, observa 500 ms de reposo, ejecuta 18 ruedas de 180 px separadas por una espera de 100 ms y espera 1200 ms al final. Métricas CDP `Performance.getMetrics`. Se informa la mediana de trabajo acumulado del hilo principal (`TaskDuration`), **no FPS, tiempo de carga ni una garantía sobre hardware real**. Los comandos y el procesamiento pueden alargar la duración total de la secuencia.

| Ruta | Trabajo antes | Trabajo después | Reducción local |
| --- | ---: | ---: | ---: |
| `/` | 3308 ms | 1666 ms | 49.6 % |
| `/tienda` | 2784 ms | 1491 ms | 46.4 % |
| `/contacto` | 3463 ms | 1548 ms | 55.3 % |
| `/terminos` | 3196 ms | 1298 ms | 59.4 % |

En todas las muestras, los RAF solicitados por JavaScript en esos 500 ms de reposo pasaron de 30–31 a **0**. Esto no significa detener las animaciones CSS del navegador. La rueda sintética cancelable pasó de cancelada a no cancelada; la prueba de cancelación se realiza después de medir para no introducir desplazamiento adicional en Lenis. Las ruedas reales llegaron a 3240 px salvo contacto, limitado por su altura. No hubo overflow horizontal.

Los recuentos de layout no mejoraron universalmente: en inicio fueron 44–47 antes y 48–58 después. Se mantienen revelados y cambios visibles durante el recorrido; no se afirma eliminar todo layout ni toda carga gráfica. El beneficio medido es menor trabajo total y eliminar el intermediario de la rueda y el bucle RAF permanente.

### Repetir la medición

Herramientas opcionales fuera de las dependencias del sitio:

```sh
npm install --prefix .local/perf --no-save playwright @sparticuz/chromium
npm run build
node scripts/medir-scroll.mjs . muestra
```

La herramienta ocupa temporalmente el puerto 3100, inicia un servidor de producción, guarda JSON/logs en `.local/perf` y lo detiene al terminar. No modifica cabeceras de seguridad ni configura una vista embebida de producción. No ejecutar simultáneamente dos muestras ni recompilar la misma carpeta mientras se mide. Las variables de conexión deben corresponder al entorno de prueba, no a una base de producción.

En este sandbox Linux se extrajeron las bibliotecas de `@sparticuz/chromium/bin/al2023.tar.br` en `.local/perf/libs` y se usó `LD_LIBRARY_PATH="$PWD/.local/perf/libs/lib"`. `ARCONET_PERF_TOOLS` permite indicar otra carpeta de herramientas. No se versionan navegadores, instalaciones ni compilaciones de la base.

## Validación funcional y visual

- ESLint sin advertencias; **104 archivos / 1268 pruebas** pasando; build de producción correcto.
- Seis pruebas nuevas de comportamiento del observador: RAF agrupado, reposo, medidas, límites/overscroll, limpieza, navegación/reduce y fallback sin ResizeObserver (varias comprobaciones por caso).
- Se actualizaron las regresiones que exigían una biblioteca/interpolación concreta para proteger el comportamiento nativo y los umbrales reales.
- Navegador: **28 casos** = siete vistas × cuatro combinaciones de ancho/movimiento/tema: 1440 normal claro, 1440 reduce oscuro, 390 normal claro y 320 reduce oscuro.
- Vistas: inicio, tienda, contacto, términos, detalle Herrajes, categoría Herrajes y componente de producto con datos sintéticos en una ruta temporal **retirada antes del build**.
- Rueda y PageDown, extremos de página, `scrollX = 0`, sin overflow ni errores de ejecución de página; carrusel móvil mantiene el índice al desplazar verticalmente.
- Títulos visibles y tarjetas con `animation-name` no `none` en normal/reduce. Se inspeccionaron capturas de escritorio y móvil, incluyendo las carpetas.
- Se verificó en navegador instrumentando `play`/`pause`: ningún intento de reproducción inicial fuera de pantalla, reproducción al entrar, pausa al ocultar pestaña y ningún reinicio fuera de pantalla al regresar. Esto comprueba la lógica de llamadas, no decodificación o consumo energético real del video.

## Límites y siguiente comprobación

No hubo base de datos local disponible. Las mediciones usan la misma condición sin DB para ambas versiones; las categorías del catálogo usan su fallback y la lista de inicio puede estar vacía. No se midieron cargas con inventario/fotos reales ni sesiones autenticadas. Los cambios de control del panel están cubiertos por pruebas, pero no se afirma haber probado visualmente una sesión administrativa real. No se encontró Brave instalado; se utilizó Chromium y emulación móvil, no dispositivos físicos.

La versión no está fusionada ni su despliegue verificado. Antes de cerrar el incidente del equipo del jefe, probar esta versión en esa PC con su rueda/trackpad y luego con el inventario real. Si persiste el problema, registrar una traza en ese equipo para separar pintura/GPU, extensiones, controladores y carga de red. Para más mejoras considerar mediciones de campo de INP/LCP/CLS y optimización de cargas reales; no añadir otra capa de scroll, WebGL o una migración de framework sin evidencia.

## Pulido posterior de navegación a secciones

A petición del usuario se activó `scroll-behavior: smooth` en la raíz para enlaces de sección, sin interpolar rueda/touch. El layout declara `data-scroll-behavior="smooth"`, como requiere Next 16 para evitar barridos al restaurar rutas. Con movimiento reducido solo se cambia ese comportamiento a `auto`; las animaciones de texto y tarjetas no se apagan.

La prueba detectó una regresión real del historial: tras usar un hash nativo, cambiar a contacto y volver, la URL volvía a inicio pero podía permanecer el contenido de contacto. Los enlaces de sección existentes ahora pasan por el listener de clic ya compartido y `router.push`, manteniendo el árbol del App Router. No se instala un listener adicional ni se muestra la cortina de cambio de página para estas anclas. Se respetan clics modificados, descargas, nueva pestaña, enlaces externos, otros queries y destinos ausentes.

Cuatro recorridos adicionales en Chromium (1440/390 × normal/reduce) verificaron posiciones intermedias reales durante el desplazamiento normal, destino por debajo de la cabecera, atrás/adelante entre anclas y restauración exacta tras visitar contacto. Se comprobaron nuevamente letras visibles, animaciones activas y ausencia de overflow. Las comprobaciones usan la rueda nativa como antes; no se añadió un motor de inercia.

Validación acumulada actualizada: ESLint, **105 archivos / 1284 pruebas** y build correctos. La tabla de rendimiento anterior corresponde a la base optimizada antes de este pulido de enlaces; no es una nueva medición de este último ajuste.
