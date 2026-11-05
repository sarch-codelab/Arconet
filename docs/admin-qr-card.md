# Acceso QR en la misma tarjeta administrativa

Al pulsar «Acceso rápido con QR», el contenido QR sustituye visualmente al formulario dentro del cuadro de acceso existente. Ya no se despliega debajo de las credenciales.

## Implementación

- `LoginView` recibe el estado abierto/cerrado del QR. Marca cabecera, formulario, nota local y pie como invisibles e inertes durante el acceso QR. Conserva su huella en el layout para que la tarjeta no crezca, se recentre ni pierda los datos escritos al volver.
- El disparador QR conserva también su espacio, pero se oculta y deshabilita mientras está abierto.
- El panel QR ocupa la misma área de `loginPanelBody`, con overflow interno defensivo si el contenido/zoom lo exige; no añade altura a la página. Se limita el scroll anchoring dentro de ese cuerpo.
- Se mantiene la imagen de fondo, el vidrio, los temas y las animaciones existentes. No hay animación nueva ni cambio de autenticación, caducidad o aprobación.
- Al abrir/generar otro QR se enfoca el título sin desplazar la página. Al cerrar se devuelve el foco al disparador, también sin scroll. Escape y «Usar correo y contraseña» cierran la vista.
- El acceso con contraseña bloquea el disparador mientras está enviándose. Cerrar conserva la cancelación del desafío, aborto de creación y limpieza del polling ya existentes.

## Validación local

- ESLint, suite completa y compilación de producción Webpack.
- Chromium contra el build de producción: 320, 390 y 1280 px × claro/oscuro × movimiento normal/reducido (12 escenarios).
- Coordenadas y dimensiones de tarjeta, y posición de scroll, sin cambio al crear, esperar, fallar, regenerar o cerrar. La medición comienza con la página cargada y el disparador visible/interactuable, antes de abrir QR.
- Formulario oculto/inaccesible mientras QR está abierto, valores restaurados al volver, foco, Escape, cancelación y ausencia de polling después de cerrar.
- Sin errores JS ni desbordamiento horizontal. Inspección visual de capturas móviles en ambos temas.

Los desafíos y respuestas API se controlaron en la prueba del navegador, sin aprobar accesos reales ni modificar cuentas. Las regresiones de seguridad del QR siguen en la suite existente. No se validó con cámara física, Safari/Brave ni en el despliegue público. El estado de fusión se registra en el PR; el despliegue público sigue sin verificarse.
