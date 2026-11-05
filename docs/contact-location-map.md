# Mapa de ubicación en la sección 01 de `/contacto`

La primera sección de contenido de `/contacto` —la etiqueta `01 / EMPECEMOS POR
AQUÍ` con la lista de cinco áreas de interés y su barra de progreso— se
sustituye por un mapa de ubicación de la sede de Arconet en San Pedro Sula.
La portada (foto, título y navegación), las secciones `02` y `03`, el formulario
y el footer no se tocan.

## Qué se hizo

- Nuevo bloque `id="ubicacion"` con título «Visítanos en San Pedro Sula»,
  dirección y horario (los mismos datos que ya muestra el footer), y dos
  enlaces: «Abrir mapa completo» (OpenStreetMap) y «Cómo llegar» (indicaciones
  de Google Maps). Ambos abren en pestaña nueva con `rel="noopener noreferrer"`.
- `<iframe>` de `www.openstreetmap.org/export/embed.html` con `bbox`,
  `layer=mapnik` y `marker`, `loading="lazy"`, `title`, `aria-label` y
  `referrerPolicy="no-referrer"`. No requiere clave de API ni biblioteca de
  mapas: no se añaden dependencias ni se consume una cuota externa.
- El enlace del pie del hero pasa de `#areas` a `#ubicacion` («Descubre dónde
  estamos»). Las áreas de interés siguen disponibles en el `<select>` del
  formulario mediante el arreglo `INTERESTS`.
- Se elimina el estado `activeArea` y su `IntersectionObserver`, junto con los
  iconos y el CSS de la lista reemplazada. Se añaden estilos propios del mapa
  (tarjeta con esquinas azules, cabecera, retícula de respaldo, pie con la
  dirección), variantes a 1040/760/390 px y reglas de tema oscuro.
- `next.config.mjs`: `frame-src` admite únicamente el origen
  `https://www.openstreetmap.org`, además de `'self' blob:` para el visor de
  documentos. El resto del CSP, incluido `frame-ancestors 'none'` en
  producción, queda igual.

## Ubicación del marcador

Se usa la dirección que el footer ya publicaba: **4 Calle 11 Avenida, Barrio
Guamilito, San Pedro Sula, Cortés**. El pin se coloca en **15.5088, -88.0307**,
coordenada declarada en el listado del negocio para esa misma dirección y que
la geocodificación inversa de OpenStreetMap resuelve sobre **4a Calle NO**, la
calle de la dirección.

El valor anterior, **15.5089, -88.0313**, se había tomado del cruce con 11
Avenida NO y caía sobre el Instituto María Auxiliadora, en Colonia Santa Ana,
señalando un lugar equivocado; se descartó.

Para mover el pin basta con cambiar `LOCATION.latitude`, `LOCATION.longitude` y
`MAP_BBOX` en `app/contacto/contact-experience.js`. El `bbox` debe quedar
centrado en la nueva coordenada y conservar un ancho cercano a 0.009° de
longitud y 0.007° de latitud, que es el encuadre actual del barrio.

## Validación

ESLint, pruebas Vitest y build de producción Webpack. Revisar además en el
navegador que el iframe cargue las teselas de OpenStreetMap (depende de la red
del visitante y de que el despliegue sirva el CSP actualizado), en escritorio y
móvil, con tema claro y oscuro.

## Límites

El pin proviene del punto declarado por el listado del negocio, no de una
verificación presencial ni de una ficha de Google Maps del local: si la empresa
dispone de una coordenada propia, conviene reemplazarla. No se verificaron
Safari, Brave ni dispositivos físicos, y la fusión del PR no garantiza que el
servidor de producción haya desplegado el nuevo build.
