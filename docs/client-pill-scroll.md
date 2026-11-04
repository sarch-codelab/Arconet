# Desplazamiento de las píldoras de /cliente

## Problemas corregidos

- La fila tenía overflow horizontal con scrollbar oculto, sin adaptación de rueda vertical ni arrastre con ratón. En una fila que desborda, centrar con `justify-content: center` también puede dejar el principio fuera del área desplazable.
- `scroll-snap-type: x proximity` podía devolver movimientos pequeños a la misma píldora.
- No se revelaba expresamente el botón activo al cambiar su ancho, enfocar con teclado o redimensionar.
- Cambiar de sección solo actualizaba estado: se conservaba el scroll vertical de una sección anterior larga.
- El detalle marcaba Cotizaciones como activa pero ocultaba su etiqueta, al comparar el texto con `activeTab` en vez de `navigationTab`.

## Solución

`lib/pill-scroll.js` conserva el scroll táctil y de trackpad nativo. Añade rueda vertical únicamente cuando la fila puede consumir ese movimiento; al llegar al extremo, deja que la página siga desplazándose. No intercepta Ctrl+rueda (zoom), Shift ni gestos horizontales. Permite arrastre con ratón con umbral de seis píxeles y evita activar una sección al terminar de arrastrar. Capturas, listeners y observador se retiran al desmontar.

La alineación usa `safe center`, con fallback al inicio. Se retira el snap. La píldora activa/enfocada se revela moviendo solo `scrollLeft`, no mediante `scrollIntoView`, para no desplazar también la página. Se observan cambios de tamaño de la fila y sus botones. Al cambiar de sección/detalle/volver, el documento vuelve al principio de forma inmediata, sin barridos ni modificar la carga inicial.

No se cambian permisos, endpoints, contenido comercial, temas ni animaciones existentes.

## Validación y límites

- ESLint, suite completa y compilación de producción Webpack.
- Chromium local: 320, 390, 768 y 1280 px × claro/oscuro × movimiento normal/reducido (16 escenarios).
- Las seis secciones, visibilidad de la activa, rueda, arrastre sin selección accidental, teclado, scroll al cambiar, detalle/volver y ausencia de errores JS o desbordamiento de página.
- Gestos táctiles mediante eventos de entrada del navegador en los tamaños móviles.
- Para probar overflow en cualquier escritorio se restringió temporalmente el ancho de la fila en el navegador de pruebas; no se aplicó esa restricción al código del portal.
- Datos de sesión/órdenes/soporte/documentos/notificaciones controlados por interceptación HTTP en las pruebas; no se modificaron cuentas reales.

El dominio público no fue accesible desde este entorno de red. Estas comprobaciones no validan el despliegue público ni una sesión/operación real contra su base de datos. No hubo pruebas en dispositivo físico, Brave o Safari. El estado de fusión se registra en el PR; el despliegue público sigue sin verificarse.
