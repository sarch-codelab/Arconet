# CodeSlots en autenticación en dos pasos

Adaptación JavaScript/CSS del diseño React Bits CodeSlots; se conserva MIT + Commons Clause en `components/ui/code-slots/LICENSE`. Motion y Hugeicons ya estaban instalados: no se añaden dependencias.

## Dónde se utiliza

- Desafío TOTP del acceso administrativo después de validar correo/contraseña.
- Confirmación de activación y desactivación de 2FA desde Mi perfil → Seguridad.
- Código TOTP al aprobar acceso QR, únicamente cuando la cuenta requiere 2FA. El código alfanumérico que se compara entre dispositivos permanece sin cambios.

Los códigos de correo de recuperación/verificación no son TOTP y no se modifican.

## Comportamiento

Seis casillas con relleno y aparición escalonada, selección activa, caret, drenaje inverso en error y lavado con marca de verificación en éxito. Paleta adaptada a claro/oscuro, ancho limitado al contenedor y casillas que se reducen en móvil. Movimiento reducido elimina rebote/desplazamiento, hace inmediato el relleno y utiliza fundidos suaves; no parpadea el caret.

La adaptación conserva **un input real con el valor completo**, `inputMode="numeric"`, `autoComplete="one-time-code"`, patrón de seis dígitos, máximo de seis caracteres y validación requerida. De esta forma funcionan edición nativa, flechas, Backspace/Delete, selección, pegado y autofill. El pegado elimina separadores y conserva ceros iniciales. Las casillas son decorativas y están ocultas a lectores de pantalla; un estado accesible indica cantidad de dígitos o aceptación/rechazo.

Admite valor controlado o inicial, onChange/onComplete, longitud, máscara, caret, desactivación, autofocus, colores, tamaños y parámetros de animación. Las pantallas reales mantienen sus botones de confirmación: completar casillas **no envía automáticamente** ni marca el código como válido. Éxito/error se establecen únicamente desde la respuesta del servidor. Durante envío y rechazo no se permiten envíos duplicados; un rechazo limpia el código al finalizar la animación y permite reintentar. El temporizador se cancela al desmontar.

No se cambian endpoints, cifrado de secretos, verificación TOTP, contraseña para desactivar, consentimiento QR, permisos ni límites de intentos. No se almacenan códigos o secretos en almacenamiento del navegador ni se añaden logs de credenciales.

## Validación local

- SSR y regresiones: normalización, ceros iniciales, seis casillas/un solo input, valor real, autofill/validación, estados, temporizador cancelable e integración en las tres pantallas.
- Chromium: claro/oscuro × movimiento normal/reducido, 390/1440 px; edición nativa, Backspace/flechas, pegado con separadores, seis casillas visibles y ausencia de desbordamiento/errores de página.
- TOTP real en la base local aislada: configuración, rechazo de código incorrecto y limpieza, activación, desafío y acceso con código válido y desactivación. La cuenta de prueba se restauró al estado original. Se respetaron los límites del servidor al dimensionar la batería.
- Aprobación QR con respuestas controladas: requiere consentimiento y seis dígitos, no envía al completar, muestra rechazo/limpieza y acepta la respuesta aprobada.

No se ha fusionado ni publicado este cambio. Las pruebas no equivalen a validación en dispositivos físicos ni en producción.
