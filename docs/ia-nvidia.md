# Asistente NVIDIA

La píldora «IA» del panel administrativo muestra el orbe y una conversación integrada en la sección, sin modal ni cristal. No hay chat ni orbe flotante en el inicio ni en otras páginas públicas. Disponible para sesiones administrativas, sin conceder permisos sobre otros módulos. El fondo fotográfico del panel administrativo se retiró; los fondos del formulario de acceso y el tema claro no cambian.

## Configuración privada

1. Revocar cualquier clave compartida en conversaciones. Crear una clave nueva en NVIDIA API Catalog.
2. Configurar `NVIDIA_API_KEY` en `C:\arconet\app\.env` (ignorado por Git y sin permiso de lectura para usuarios normales) o en los secretos del servidor. Nunca usar `NEXT_PUBLIC_` ni añadirla al repositorio.
3. `NVIDIA_MODEL` selecciona un modelo disponible para esa cuenta. Predeterminado: `nvidia/nemotron-3.5-bolt-e4b`. El anterior (`meta/llama-3.1-8b-instruct`) está retirado desde 2026-08-26 y devuelve 410. La cuenta debe tener el modelo habilitado; si no, NVIDIA responde 404.
4. Configurar `APP_ORIGIN` al origen HTTPS exacto del sitio, sin barra final, y reiniciar el servidor. Sin clave, el endpoint devuelve 503, no respuestas simuladas.

`POST /api/ai/chat` exige una sesión administrativa válida y llama únicamente a `https://integrate.api.nvidia.com/v1/chat/completions` desde Node. El navegador usa una URL relativa; no recibe la clave. El prompt orienta al modelo a Arconet sin inventar precios, inventario o acceso a cuentas. No hay RAG, acceso administrativo, herramientas ni acciones sobre datos internos. Las respuestas se renderizan como texto, no HTML.

## Privacidad y límites

La conversación se mantiene en memoria del navegador y se borra al salir de la sección o pulsar «Nueva conversación». Los últimos turnos se envían a NVIDIA para responder, sujeto a las condiciones y retención de ese proveedor; no afirmar retención cero. Arconet no guarda mensajes en base de datos ni registra cuerpos/credenciales en este flujo. La interfaz advierte no compartir datos sensibles y que la IA puede equivocarse.

32 KiB por petición, hasta 12 mensajes alternados, 4000 caracteres por mensaje y 16000 totales, salida de 700 tokens y timeout de 30 segundos. El cliente acepta entradas de 2000 caracteres. Límites de 10 peticiones/minuto/IP y 100/hora globales **por proceso**, sin garantía de coste monetario. El proxy de despliegue debe sobrescribir `X-Forwarded-For`; no confiar en cabeceras arbitrarias. Para múltiples instancias o exposición de alto tráfico, sustituir el almacén en memoria por un limitador distribuido y aplicar cuotas/bloqueos también en NVIDIA y en el proxy. El control de origen reduce llamadas cruzadas desde navegadores; no autentica al público ni detiene scripts externos.

## Verificación

Tests del endpoint con proveedor simulado: validación, origen, límites, clave ausente, errores y salida segura. En el servidor de producción se verificó una respuesta real de NVIDIA con `nvidia/nemotron-3.5-bolt-e4b` (2,4–2,7 s, español correcto y sin inventar precios). La clave vive solo en `.env`, fuera de Git. Para verificar en despliegue, enviar un mensaje no sensible desde el chat del panel; revisar límites antes de abrirlo a tráfico público. Si se comparte una clave en un chat, rotarla: la copia compartida debe considerarse comprometida.

## Diagnóstico de `POST /api/ai/chat` con 403

El endpoint devuelve 403 `ai_origin_forbidden` antes de contactar a NVIDIA si el `Origin` del navegador no coincide con el origen público configurado, falta `Origin` o `Sec-Fetch-Site` indica `cross-site`. La sesión ausente da 401; los errores de NVIDIA dan 502. Un 403 por sí solo no confirma la causa: inspeccionar Response en Network para distinguir el JSON de Arconet de una página HTML de bloqueo del proxy/WAF.

Para `https://arconethn.com`, configurar en el proceso que ejecuta Next:

```dotenv
APP_ORIGIN="https://arconethn.com"
```

Reiniciar/recrear el servicio tras cambiar el entorno. Debe ser el dominio HTTPS público, no `localhost`, la IP del servidor ni el HTTP interno del proxy. `www.arconethn.com` es otro origen: redirigirlo al dominio canónico, no ampliar permisos con comodines. La comparación ahora normaliza barras finales, espacios exteriores, mayúsculas del host y puertos predeterminados. No acepta orígenes ajenos ni confía en `Host`/`X-Forwarded-Host`. En producción la configuración ausente o inválida devuelve 503 `ai_origin_configuration`, con un mensaje accionable y sin exponer credenciales.

Comprobación: Network → petición → Request Headers (`Origin`, `Sec-Fetch-Site`) y Response (`code`, `error`). No compartir cookies, claves ni cabeceras Authorization. Si la respuesta es HTML o no contiene esos códigos, revisar reglas del proxy/Cloudflare y su identificador de petición, sin desactivar el WAF completo ni el control de origen.

## Nombre y bienvenida

La asistente se presenta como **Monica IA** en el encabezado, las respuestas y el prompt del servidor. El orbe principal está centrado sobre la firma «Monica IA» en la bienvenida (se retiraron «¿Qué tienes en mente?» y su subtítulo); el orbe pequeño de la píldora administrativa se conserva. La bienvenida vuelve al inicio al crear una conversación nueva. No cambia el modelo, la autenticación ni la configuración de origen o credenciales.

La barra de mensaje conserva un único indicador de foco a nivel del contenedor. Se elimina el contorno nativo interior del textarea sin quitar el foco visible del contenedor ni el del botón de envío. El pie no se comprime al reducir el espacio disponible.

## Acceso de todos los roles del panel

Monica IA es una sección común (`ia` en `ALWAYS_VISIBLE_SECTIONS`), igual que Mi perfil. Todos los roles administrativos, incluidos roles nuevos o sin permisos de módulos, pueden abrir la píldora y `?section=ia`. El endpoint sólo exige una sesión administrativa válida: no exige `ia:read` ni un rol concreto. Todos usan el mismo chat, modelo y opciones; no hay una versión recortada por rol.

No se necesitan migraciones ni editar cada rol existente. Esto no concede permisos en Ventas, Inventario, Personal o Ajustes, ni permite al modelo leer datos privados o ejecutar acciones. No se abre el chat a visitantes anónimos ni a sesiones del portal de clientes. Siguen vigentes origen, sesión y límites de uso.

Regresiones: matriz de acceso por permisos (administrador, gerente, ventas, técnico, bodega, lectura, precios y personalizado sin permisos), URL directa y endpoint con proveedor simulado. Navegador con cuentas reales de prueba de administrador, ventas, técnico y bodega: píldora, envío/reinicio y textarea nativo. La petición real al endpoint sin clave local pasa la sesión y llega al 503 de configuración; no se probó NVIDIA en vivo.

## Indicador al enviar mensajes

El chat usa `components/ui/thought-line/thought-line.js`, adaptado de React Bits ThoughtLine (MIT + Commons Clause). Dependencias: `motion`, `@hugeicons/react` y `@hugeicons/core-free-icons`. Mientras la petición real está pendiente muestra «Pensando…», destello/respiración y cronómetro. Al llegar la respuesta conserva el tiempo y cambia a «Respuesta preparada en». No muestra supuestos razonamientos, consultas a notas ni fases que el endpoint no comunica.

El mismo componente permanece montado al llegar la respuesta para conservar el reloj; cada envío nuevo inicia uno nuevo. Un fallo detiene el efecto con «Solicitud finalizada sin respuesta», conserva el error y permite reintentar. «Nueva conversación» aborta la petición y elimina el indicador, sin respuestas tardías. No se modifica la autenticación, los permisos, las credenciales ni el contrato del proveedor.

Validación local adicional: navegador Chromium en claro/oscuro y movimiento normal/reducido, anchuras 390/1440 px, respuestas controladas, reloj activo y congelado, error, reintento y cancelación sin desbordamiento ni errores de página. El brillo se atenúa con movimiento reducido. Se anuncian cambios de estado accesibles sin anunciar cada décima del reloj. Estas pruebas no son una verificación de conectividad real con NVIDIA.

## Campo PromptBar

El campo de escritura adopta el estilo de React Bits PromptBar mediante una adaptación enfocada en las capacidades reales del chat (`components/ui/prompt-bar`, licencia MIT + Commons Clause conservada). Incluye superficie redondeada, texto expansible hasta cinco líneas, identidad de Monica IA y botón que transforma la flecha en un cuadrado para detener la petición. Se usan las dependencias Motion y Hugeicons ya instaladas, sin añadir nuevas.

Conserva borrador controlado, sugerencias, máximo de 2000 caracteres, Enter para enviar, Shift+Enter para una nueva línea y protección de composición IME. El botón de detener aborta la petición, detiene ThoughtLine, conserva el historial anterior y restaura el mensaje para reintentarlo; una respuesta tardía no se incorpora. Nueva conversación sigue borrando y cancelando todo. No hay menús ficticios de modelos/esfuerzo, adjuntos, búsqueda web ni micrófono sin soporte del endpoint.

Los colores se ajustan a ambos temas, con foco de teclado visible, controles táctiles y movimiento reducido. ThoughtLine recibe una tinta explícita por tema para que su shimmer no herede texto transparente. Validación local en Chromium con temas claro/oscuro y movimiento normal/reducido: crecimiento y scroll del campo, envío, Enter/Shift+Enter, transformación del botón, cancelación, restauración, error y reinicio; anchuras de 390/1440 px sin desbordamiento. Respuestas del proveedor simuladas para estas pruebas; no verifica NVIDIA en vivo.

### Ajuste visual posterior

El contenedor de Monica IA usa `data-border-glow="off"`: no recibe BorderGlow ni lo heredan sus descendientes. Se mantiene el borde estático y el foco accesible del campo PromptBar. El cursor personalizado ya no se monta globalmente; vuelve el cursor nativo del navegador. Flickering Grid aparece en el fondo del panel, detrás del cuadro opaco de Monica, sin cubrir mensajes ni controles.
