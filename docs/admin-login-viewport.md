# /admin adaptado al viewport

El acceso tenía únicamente `min-height: 100svh`. La suma de padding de página, padding de tarjeta, título, formulario, disparador QR y separaciones podía superar la pantalla y crear scroll de documento.

La clase `adminLoginPage`, aplicada solo al acceso administrativo, usa altura de viewport dinámica con fallback `vh`, padding compacto y tarjeta centrada de hasta 680px, limitada al espacio disponible. Se compactan logo, encabezado, separaciones y QR sin cambiar fondos, temas, efectos de texto ni autenticación. `/login` y `/recuperar` no reciben esta clase.

En pantallas habituales el formulario inicial y QR caben sin scroll interno. En ventanas especialmente bajas, zoom o contenido adicional, el documento sigue sin desplazarse y la tarjeta ofrece scroll interno para mantener accesibles campos y acciones. No se usa escalado por transform ni se ocultan controles para simular que caben.

El QR conserva las dimensiones de la tarjeta. Mientras está abierto, solo su panel controla el scroll interno: se reinicia el desplazamiento del cuerpo al abrir para evitar heredar la posición baja de las credenciales y se restaura al cerrar. Así no quedan el título/QR recortados tras abrir desde una ventana baja.

## Validación local

- ESLint, 132 archivos / 1537 pruebas y build de producción aprobados.
- Chromium sobre build de producción: 320×568, 375×667, 390×844, 1366×768, 1920×1080, 844×390, 390×360 y 640×384; claro/oscuro y movimiento normal/reducido (32 escenarios).
- `scrollHeight <= innerHeight`, sin overflow horizontal y scroll vertical del documento en cero; tarjeta dentro del viewport.
- Formulario, QR en la misma posición/tamaño y encabezado visible, vuelta a credenciales, segundo factor y acceso al pie por teclado; sin errores JS.
- En las alturas de al menos 667px, comprobación adicional de formulario inicial/QR sin overflow interno.
- Ventanas bajas verificadas con scroll interno, no con controles inaccesibles. 640×384 prueba una distribución equivalente a reducir a la mitad el viewport de escritorio; no sustituye una prueba de zoom real en un dispositivo físico.

Sesión, respuestas de login/2FA y desafíos QR controlados en el navegador: no se iniciaron sesiones reales. Capturas móviles inspeccionadas. No se validó Safari/Brave, cámara física o despliegue público. La fusión y los checks de GitHub no equivalen a que Windows haya activado el build nuevo; el despliegue debe verificarse por separado.
