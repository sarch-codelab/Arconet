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
