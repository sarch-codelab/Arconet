# Recuperación con el diseño del login

`/recuperar` seguía montando el panel lateral de imagen y las clases antiguas `loginVisual*`/`logoTab`, ya retiradas del CSS compartido cuando `/login` pasó a una sola tarjeta. Esto dejaba contenido antiguo fuera de su estructura esperada, pese a importar el mismo CSS.

Se retira ese panel y se usa el logo centrado, tarjeta de vidrio, fondo por tema, tipografía, campos y botón de `/login`. Se conserva el menú móvil y los enlaces de acceso, registro, ayuda y legales. Como en `/login`, no se monta el footer comercial completo debajo de la pantalla de acceso. Los estados específicos de recuperación permanecen en su CSS local, con mensajes largos adaptables y errores legibles en oscuro.

No se cambian endpoints ni reglas: solicitar código, respuesta genérica para no enumerar cuentas, reenvío, código de seis dígitos, contraseña/confirmación, política, bloqueos de envío y resultado siguen el flujo existente. Los pasos ahora marcan el actual con `aria-current="step"`.

## Validación local

- ESLint, 130 archivos / 1532 pruebas y compilación de producción aprobados (incluye el cambio QR pendiente en la misma rama).
- Chromium sobre build de producción: 320/390/1280 px × claro/oscuro × movimiento normal/reducido, 12 escenarios.
- Comparación de estilos calculados con `/login`: fondo, color de vidrio, radio y ancho de tarjeta coinciden.
- Correo inválido, fallo de envío/reintento, reenvío, código con cero inicial, confirmación distinta, mostrar contraseña, rechazo del servidor y éxito, sin overflow horizontal ni errores JS.
- Inspección de capturas móviles en ambos temas.

Respuestas API controladas en navegador: no se enviaron correos reales ni se cambiaron contraseñas de cuentas. Sin prueba física, Brave/Safari ni verificación del dominio público. El estado de fusión se registra en el PR; el despliegue público sigue sin verificarse.
