# Cambio circular de tema

El botón existente adopta el efecto circular de Magic UI Animated Theme Toggler, de Nazam Kalsi (MIT; licencia en `components/ui/animated-theme-toggler/LICENSE`). No se añaden dependencias, botones duplicados ni una biblioteca de temas distinta.

`lib/theme-transition.js` usa View Transitions para revelar la nueva paleta desde el centro del control, durante 400 ms. El círculo crece hasta cubrir la esquina más lejana. Tanto el origen como el radio usan porcentajes para evitar desalineación con escalado fraccionario de pantalla. La forma aplicada es el círculo del ejemplo predeterminado; no se añaden controles de formas al sitio.

## Integración con el sistema existente

- Se conserva `arconet-theme` y el ciclo automático por hora → claro → oscuro.
- Botón flotante y control del menú móvil comparten el mismo store y efecto.
- El panel conserva su preferencia personal claro/oscuro/dispositivo. Se anima desde la opción elegida en Apariencia, se persiste por el endpoint existente y se restaura el valor anterior si falla el guardado. El botón flotante continúa oculto dentro del panel.
- La inicialización y los cambios automáticos no provocan barridos de pantalla.
- Si el almacenamiento está restringido, la selección puede cambiar durante la sesión sin romper el control.

La paleta se aplica sincrónicamente dentro del callback de captura. Solo se completan transiciones CSS de colores para obtener una captura con la paleta final; no se detienen animaciones de texto, movimiento u opacidad. Todas las reglas de pseudoelementos están limitadas al atributo temporal `data-arconet-theme-vt`; no afectan transiciones de navegación ajenas.

Sin soporte de View Transitions o con movimiento reducido, el cambio se aplica sin el barrido. Un bloqueo compartido evita superponer clics rápidos. Finalización, fallo, cancelación, desmontaje y un timeout defensivo limpian animaciones, atributos y variables temporales; no queda bloqueado el botón si una captura se omite.

## Validación local

- Pruebas de geometría, fallback, revelado, doble activación, fallos y cancelación con API que no resuelve, y aislamiento CSS.
- Chromium con View Transitions nativo: animación del pseudo-elemento root con círculos porcentuales y duración de 400 ms, ciclo de modos, preferencia guardada y clics repetidos.
- Fallback sin API y movimiento reducido sin iniciar View Transitions.
- Menú móvil de 390 px: sincronización, persistencia al recargar, almacenamiento restringido y ausencia de desbordamiento.
- Apariencia del panel: preferencia controlada, persistencia por API con respuesta controlada y ausencia del botón flotante.

Son comprobaciones locales, no validación en dispositivos físicos ni del despliegue público.
