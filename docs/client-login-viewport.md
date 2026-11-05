# /login adaptado al viewport

El acceso de clientes adopta las mismas reglas de altura y distribución de `/admin` mediante una clase propia `clientLoginPage`. Se comparten los selectores, en vez de duplicar valores o introducir el nombre de la clase administrativa en el login de clientes.

- Alto de viewport dinámico con fallback `vh`, tarjeta centrada y limitada al espacio disponible, sin scroll de documento.
- Espaciados, logo y título compactos como en el acceso administrativo.
- Scroll solo en el cuerpo de la tarjeta cuando la ventana es demasiado baja o el contenido lo requiere; no se recortan campos ni enlaces para simular que caben.
- Se conservan fondos claro/oscuro, vidrio, animaciones, enlaces y menú existente.
- Sin cambios de autenticación, recordarme, mensajes, bloqueo durante envío ni redirección al portal. Registro y recuperación se incorporaron después a la misma clase y al mismo ajuste; ver `docs/client-auth-viewport.md`.

## Validación local

ESLint, suite completa y compilación de producción Webpack aprobados. Chromium sobre el build de producción en 320×568, 375×667, 390×844, 1366×768, 1920×1080, 844×390, 390×360 y 640×384, claro/oscuro y movimiento normal/reducido (32 escenarios).

Se comprobaron límites de tarjeta dentro de la pantalla, `scrollHeight <= innerHeight`, ausencia de overflow horizontal y scroll vertical del documento en cero. En alturas de al menos 667px, el formulario inicial cabe sin scroll interno. Se enfocaron los enlaces por teclado, se abrió/cerró el menú móvil con Escape y se probaron mostrar/ocultar contraseña, fallo de acceso, reintento y navegación al portal. Capturas móviles inspeccionadas; sin errores JS en esas pruebas.

La API se interceptó con respuestas controladas: no se usaron cuentas reales ni se validó un inicio de sesión contra producción. La vista 640×384 comprueba una distribución reducida, no zoom real de un dispositivo físico. Sin verificación en Safari/Brave o del despliegue público. La fusión no confirma la activación del build en Windows.
