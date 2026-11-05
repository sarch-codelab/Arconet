# Accesos de clientes: mismo viewport y mismo diseño que /admin

`/recuperar` y `/registro` conservaban `min-height: 100svh` y `overflow-y: auto`: el documento podía crecer y desplazarse. Además, `/registro` seguía montando el panel lateral de imagen de un diseño anterior (`loginVisual*`, `logoTab`, `lead`, `infraestructura.jpg`) cuyas clases ya no existen en el CSS compartido, más el footer comercial completo debajo de la tarjeta. Por eso se veía distinto y "raro" frente a `/admin` y `/login`.

## Cambios

- Las tres pantallas de acceso de clientes (`/login`, `/recuperar`, `/registro`) usan la clase compartida `clientLoginPage`, que agrupa selectores con `adminLoginPage`: altura de viewport dinámica con fallback `vh`, tarjeta centrada contenida en la pantalla, sin scroll de documento y con scroll interno accesible en el cuerpo de la tarjeta cuando el contenido no cabe.
- `/registro` pasa a la misma tarjeta única: logo centrado, vidrio, fondo por tema, tipografía, campos, botón y animaciones de `/login` / `/admin`. Se retira el panel fotográfico obsoleto y el `Footer` público, que era incompatible con una pantalla sin scroll de página. Los registros locales sólo conservan estados propios (fuerza de contraseña, consentimiento, errores).
- Se conservan todos los campos, `required`, política de contraseña, fuerza, revelar/ocultar, consentimiento, enlaces legales y de ayuda, endpoints `/api/cliente-auth/registro` y `/api/cuenta/*`, bloqueos de doble envío, mensajes y redirección a `/verificar`. Los enlaces del panel retirado se mantienen dentro de la tarjeta (`/contacto`, `/ayuda`).
- `/registro` recibe además `clientRegisterPage`: por tener más campos, la tarjeta puede crecer hasta 960px en viewports altos y compacta ligeramente sus separaciones. El límite real sigue siendo `min(100%, 960px)`, nunca el documento; en ventanas bajas continúa el scroll interno.
- El CSS local de registro deja de forzar `min-height: 100%` y elimina reglas `:global(.checkbox)` que ya no coincidían con las clases con hash del módulo compartido.
- Sin cambios en autenticación, temas, menú flotante, QR administrativo ni en la regla `[data-qr-open]`.

## Validación local

ESLint, suite completa y compilación de producción Webpack aprobados. Chromium sobre el build de producción:

- **32 escenarios** de matriz: ocho viewports (320×568, 375×667, 390×844, 1366×768, 1920×1080, 844×390, 390×360, 640×384) × claro/oscuro × movimiento normal/reducido.
- En cada uno: `scrollHeight <= innerHeight`, sin overflow horizontal, `scrollY = 0`, tarjeta completamente dentro del viewport, `overflow-y: auto` en el cuerpo, logo presente y sin panel visual ni `<footer>` público.
- Estilos calculados de la tarjeta (fondo, radio, borde, desenfoque y ancho) idénticos a `/login` en el mismo viewport y tema.
- `/recuperar` en su primer paso cabe sin scroll interno desde 667px de alto; `/registro` cabe sin scroll interno en 1920×1080. Cuando hay desbordamiento interno se comprueba que el cuerpo se desplaza y que la acción principal queda visible, sin mover el documento.
- **6 flujos** de interacción en 390×844 claro, 1366×768 oscuro con movimiento reducido y 390×360 oscuro: enlaces por teclado, menú móvil con Escape, validación de correo, fallo controlado y reintento, reenvío de código, código con cero inicial, error de confirmación, revelar contraseña y éxito en `/recuperar`; campos, fuerza, política, confirmación, consentimiento, revelar, fallo/reintento y alta con redirección a `/verificar` en `/registro`. `/admin` sigue sin scroll de documento.
- Sin errores JS en las páginas de acceso; capturas móviles y de escritorio inspeccionadas.

## Límites

Todas las respuestas API del navegador fueron controladas: no se enviaron correos, no se crearon cuentas ni se cambiaron contraseñas reales. No se probó Safari/Brave ni dispositivos físicos, ni zoom real del sistema. La inspección del dominio público mostró que `https://arconethn.com/registro` todavía servía el diseño anterior con el build del merge previo (`dpl=9577e6a`); la fusión no equivale a confirmar que el servidor Windows haya activado este nuevo build. Verificar el despliegue por separado.
