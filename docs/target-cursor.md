# TargetCursor global

Integración de React Bits JavaScript + CSS, adaptada a todas las páginas de Arconet. No añade dependencias de animación.

## Alcance

- `app/site-target-cursor.js` difiere la carga del componente mediante `next/dynamic` y sólo lo monta con `(hover: hover) and (pointer: fine)`.
- `app/layout.js` monta una sola instancia para todo el sitio: home, tienda, login, panel administrativo, páginas legales y 404. No se duplica en la home. Al cambiar de pathname se limpia el estado anterior (objetivo, estilos y eventos) antes de reactivar el cursor con mouse.
- Se ajusta a enlaces con destino, botones habilitados y elementos con rol de botón. Las tarjetas que son enlaces quedan incluidas, no las tarjetas informativas.
- Retícula de 30 px, esquinas de 9 px y trazo de 2 px, giro de tres segundos, ajuste de 0.24 s y color blanco en modo `difference` para contraste sobre ambos temas.
- Etiquetas opcionales por `data-cursor-label`; la llamada a catálogo incluye «Explorar catálogo».

## Seguridad visual y accesibilidad

- Portal decorativo con `aria-hidden` y `pointer-events:none`: no intercepta clics, foco ni scroll, no cambia etiquetas accesibles.
- El cursor nativo se oculta globalmente sólo mientras el puntero está activo. Input, textarea, select, contenteditable, iframes y `data-native-cursor` conservan su cursor normal. También lo conservan los diálogos nativos abiertos: el cursor decorativo vive fuera de su top layer y no debe ocultar allí el cursor del sistema.
- Tab/Escape, blur, dragstart, pointercancel, eventos de otros tipos de puntero y pestaña oculta restauran el cursor nativo. El desmontaje elimina listeners, estilos inyectados y la marca de alcance.
- No se instala en dispositivos táctiles con puntero principal grueso. Los cambios de capacidad de puntero y de movimiento reducido se observan en vivo.
- Con movimiento reducido se suavizan giro, paralaje y pulsación sin desactivar el cursor.
- El dibujo se limita aproximadamente a 30 fps; usa principalmente transform/opacity. Tamaños y bordes constantes sólo se actualizan cuando cambian las opciones. Se cancela RAF cuando está oculto o inactivo; los bordes siguen midiendo el target mientras está seleccionado para acompañar sus transiciones.

## Procedencia

https://github.com/DavidHDev/react-bits/tree/main/src/content/Animations/TargetCursor . Se conserva la licencia **MIT + Commons Clause** en `components/ui/target-cursor/LICENSE`; no es MIT sin restricciones.

## Validación

Lint, suite completa y build. Chromium claro/oscuro, movimiento normal/reducido: ajuste a enlace, etiqueta, pulsación, teclado, edición, blur, restauración al cambiar de página y ausencia de overflow cerca del borde. Contexto móvil/táctil: no aparece ni oculta el cursor nativo. Capturas en `.local/visual/cursor-*`, fuera de Git. Sin prueba en teléfono físico ni despliegue a producción.

Ampliación global validada en home, tienda, login, administración, privacidad y 404, ambos temas y preferencias de movimiento; navegación SPA y regreso sin duplicar cursores ni estilos. Contexto táctil verificado en home, tienda, login y administración.

## Estado actual: desactivado

Por petición posterior del usuario, el layout raíz dejó de montar `SiteTargetCursor`. Se utiliza el cursor nativo en todas las páginas y controles. El componente y sus pruebas de comportamiento se conservan como código reutilizable, pero no se cargan desde el layout ni se aplica ocultación global del cursor.
