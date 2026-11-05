# Imagen principal de contacto

Se reemplaza únicamente la portada de `/contacto`, antes compartida con `/catalogo/infraestructura.jpg`, por `/contacto-asesoria-fibra.webp`.

La nueva imagen es una escena ilustrativa generada con IA de asesoría técnica: profesionales revisando fibra óptica, conectores y un proyecto de red, con equipos de telecomunicaciones al fondo. No es una fotografía documental de empleados o instalaciones reales de Arconet. Encaja con la invitación de la página a conversar sobre un proyecto.

WebP local de 1376 × 768, 67 418 bytes (~66 KiB), sin proveedor de imágenes externo. Se conservan Next Image, prioridad de portada, tamaños, recorte, overlay y animación existentes. No se cambia el formulario, textos, navegación ni la imagen secundaria de la sección «Así trabajamos».

Posteriormente la columna de texto se movió a la izquierda, se ajustó el degradado y se igualó la tipografía del hero con la de `/tienda`; ver `docs/contact-hero-copy.md`.

Validación local: ESLint, 131 archivos / 1534 pruebas y build de producción aprobados. Chromium en 390/1280 px × claro/oscuro × movimiento normal/reducido (8 escenarios): imagen decodificada, object-fit/opacity conservados, formulario presente, sin overflow ni errores JS; capturas inspeccionadas en móvil/escritorio. No se validó el despliegue público ni dispositivos físicos. El estado de fusión conjunta con QR y recuperación se registra en el PR; el despliegue público sigue sin verificarse.
