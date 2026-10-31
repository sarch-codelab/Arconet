# Arconet

Plataforma web de **Arconet** (fibra óptica, CATV y telecomunicaciones, Honduras):
sitio público con catálogo, portal de clientes y panel administrativo con
inventario, facturación, órdenes y escáner de códigos de barras.

## Stack

- **Next.js 16** (App Router, JavaScript) + React 19
- **Prisma 7** con adapter `pg` sobre **PostgreSQL**
- **nodemailer** para correo transaccional (SMTP)
- Deploy auto-gestionado: la tarea `ArconetDeployPoll` del servidor hace pull
  de `origin/main` cada 5 minutos (el servidor está en ZeroTier, sin IP
  pública; el workflow de CI solo compila para detectar errores temprano).

## Requisitos

- Node.js **24** (la CI usa 24; el servidor también)
- PostgreSQL accesible (local o remoto)
- PowerShell/PM2 solo para el servidor Windows de producción (`ops/`, `deploy.ps1`, `ecosystem.config.js`)

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm ci

# 2. Configurar variables de entorno
cp .env.example .env      # y editar los valores reales

# 3. Generar cliente Prisma + aplicar migraciones
npm run db:generate
npm run db:migrate

# 4. (Opcional) poblar datos semilla
npm run db:seed

# 5. Desarrollo
npm run dev               # http://localhost:3000
```

Producción local: `npm run build && npm start`.


## Vista previa completamente local (sin el Xeon)

```bash
npm ci
npm run dev:local                 # web en 0.0.0.0:3000
# Otro puerto web: npm run dev:local -- --port 3001
```

Este comando inicia **PostgreSQL 17 real**, aislado en `127.0.0.1:55432`, crea
`arconet_local`, aplica los SQL de las migraciones y carga datos de prueba en
el primer inicio. No necesita ZeroTier, Docker, PostgreSQL instalado ni las
credenciales del servidor. No modifica `.env` ni utiliza su conexión/SMTP.
Las fuentes tipográficas también se sirven localmente, sin Google Fonts.
En la vista HTTPS de Arena, la demo usa cookies de sesión `HttpOnly`, `Secure`
y particionadas para funcionar dentro del iframe. Si la vista previa no
conserva esas cookies, la demo también transporta su sesión firmada en una
cabecera, guardada solo en `sessionStorage` de la pestaña (o en memoria si
storage está bloqueado). Conserva la comprobación de contraseña, firma,
sesión vigente y permisos de las APIs. La carcasa del panel no incluye datos
privados hasta comprobar la sesión. Esta alternativa requiere desarrollo,
la bandera local y la base exacta `arconet_local` en `127.0.0.1:55432`;
no se activa en producción ni contra otra base. No se ponen tokens en URLs.
Si el navegador restringe el portapapeles, la web intenta una alternativa y
avisa si no pudo copiar.
Para abrirla en otra pestaña, utiliza los controles de vista previa de Arena.

En Arena, accede desde su panel **Vista previa**. Los enlaces directos a
`*.e2b.app` pueden requerir autorización de tráfico del sandbox y devolver
`403 Missing traffic access token`. Ese bloqueo es de la plataforma, no del
login de Arconet, y no se corrige modificando los headers de la aplicación.

| Acceso | Usuario | Contraseña de prueba |
| --- | --- | --- |
| Administración (`/admin`) | `admin` o `admin@arconet.local` | `1234` |
| Portal de clientes (`/login`) | `cliente@arconet.local` | `1234` |
| Rol ventas (`/admin`) | `ventas@arconet.local` | `1234` |
| Rol técnico (`/admin`) | `tecnico@arconet.local` | `1234` |
| Rol bodega (`/admin`) | `bodega@arconet.local` | `1234` |

Incluye productos, categorías, sucursales, clientes, cotizaciones/ventas,
existencias en dos bodegas, kardex, proveedor, compra y solicitud interna.
La facturación de prueba no tiene CAI ni validez fiscal. Los correos no se
envían a Internet: aparecen en consola y en **Bitácora** del panel.

**Solo para pruebas:** las cuentas cortas se crean exclusivamente contra la
base local y con `NODE_ENV=development`. El alias `admin` y las indicaciones
de prueba no se activan en producción. El seed normal mantiene su requisito
de contraseña segura (`SEED_ADMIN_PASSWORD`, mínimo 12 caracteres).

Datos y secretos aleatorios del clúster: `.local/arconet-preview/`, ignorado
por Git. Se conservan al detener y reiniciar el comando en el mismo entorno;
no se vuelve a cargar el seed ni se sobrescriben tus pruebas en cada inicio.
Son datos desechables: no sustituyen un respaldo y pueden desaparecer si se
recrea el entorno de Arena. Al detener el comando se detienen web y base.

Comprobación: `/api/health` debe devolver HTTP 200 con `db: "up"`.
Si el entorno bloquea `binaries.prisma.sh`, la generación WASM de Prisma no
necesita ejecutar su motor nativo; en este sandbox se omite esa descarga al
iniciar con `PRISMA_SCHEMA_ENGINE_BINARY=/bin/true npm run dev:local` (Linux,
solo generación). Las migraciones locales se ejecutan con el driver PostgreSQL,
con transacciones y checksums; no se usa ese reemplazo para migrar producción.

## Facturas y cotizaciones: impresión

En **Ventas**, abre el documento con el botón de impresión de una cotización,
venta o factura. Se abre un **visor dentro del mismo panel**, sin pestañas
nuevas ni permisos para ventanas emergentes.

**Automático** es la opción inicial: utiliza el tamaño de papel configurado en
el diálogo/controlador de la impresora. La distribución se adapta al ancho
imprimible: en papeles de hasta 100 mm usa un recibo vertical legible, no una
tabla de seis columnas reducida. Funciona con los modelos que el navegador y
el sistema operativo puedan imprimir; no detecta marcas, instala controladores,
se conecta por Bluetooth/USB directamente ni controla el cortador de papel.

Si necesitas fijar el formato, el selector **Tamaño de papel** ofrece:

- **Hoja completa (Carta):** 215.9 × 279.4 mm (8.5 × 11 pulgadas).
- **Media hoja:** 215.9 × 139.7 mm, todo el ancho de una carta y mitad de altura.
- **Media carta vertical:** 139.7 × 215.9 mm, conservando el formato anterior.
- **Recibo / ticket de 80 mm:** 72 mm útiles con márgenes laterales de 4 mm.
- **Recibo / ticket de 58 mm:** 48 mm útiles con márgenes laterales de 5 mm.

Los rollos de 58/80 mm ajustan su largo al contenido antes de imprimir,
incluyendo logo, cliente, detalle, descuentos, impuestos, pagos y autorización
cuando correspondan. No añaden un pie de numeración de hojas. Si el documento
supera los 3 metros continúa en otra página, sin perder artículos ni notas.
En automático, el largo depende del papel configurado en el controlador.
La última elección se recuerda en este navegador; solo se guarda la clave del
formato, nunca documentos ni sesiones. Si el almacenamiento está bloqueado,
se conserva en memoria durante esa visita.

Usa escala 100 %, el papel correspondiente en la impresora y desactiva los
encabezados/pies automáticos del navegador. Los formatos de hoja conservan su
numeración. Los detalles y notas largos continúan en páginas adicionales,
repitiendo los encabezados de la tabla en lugar de recortar información;
no se fuerza un documento largo a caber en media hoja.

Los tres endpoints (administración comercial, facturación fiscal y portal de
clientes) usan `lib/print-document.js`. El logo original tiene una versión
monocromática en `public/arconet-impresion.png`, embebida dentro del documento;
no depende de descargar imágenes al imprimir. Toda la plantilla es en blanco
y negro, incluida la vista previa. El selector también funciona con los
archivos `blob:` autenticados de la demo sin cookies. Las cookies normales
de producción usan el mismo visor, manteniendo la autenticación y los permisos.
La URL temporal se libera al cerrar el visor, no después de un minuto.
**Guardar copia HTML** descarga el documento autónomo con el formato
seleccionado para abrirlo e imprimirlo si la vista embebida restringe los
diálogos de impresión. CSV/Excel continúan descargándose directamente.
Los endpoints aceptan `?formato=auto`, `carta`, `media-hoja`, `media-carta`,
`ticket-80` o `ticket-58`; una elección explícita tiene prioridad sobre la
preferencia guardada.

Se conservan los datos registrados de empresa y cliente, RTN, referencias,
fechas, productos, cantidades, precios, descuentos, totales y notas. Las ventas
comerciales muestran pagos confirmados y saldo; las facturas fiscales incluyen
el desglose de ISV y la autorización registrada. **No se inventan impuestos,
CAI, rangos ni vigencias**: una orden comercial no reemplaza una factura fiscal,
y un documento sin CAI/numeración se identifica como **sin validez fiscal**.
La huella SHA-256 identifica el registro, no los bytes del PDF generado.

La navegación del panel normaliza enlaces antiguos de cotizaciones/facturación
a **Ventas**, conserva el contexto de su cabecera y prioriza `?section=ventas`
sobre hashes antiguos como `#trabajadores`, incluso al recargar o usar Atrás.

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | `prisma generate` + `next dev` |
| `npm run build` | `prisma generate` + `next build` |
| `npm start` | Servidor de producción |
| `npm run lint` | ESLint (next/core-web-vitals) |
| `npm run test` | Tests con Vitest (`vitest run`) |
| `npm run db:generate` | Regenera el cliente Prisma |
| `npm run db:migrate` | Aplica migraciones pendientes |
| `npm run db:seed` | Carga datos semilla (`prisma/seed.ts`) |
| `npm run db:studio` | Abre Prisma Studio |

## Variables de entorno

Ver `.env.example` con todas y su descripción. Resumen: `DATABASE_URL`,
`SESSION_SECRET`, `APP_ORIGIN`, bloque SMTP (`SMTP_HOST/PORT/USER/PASS`,
`EMAIL_FROM`), `NEXT_PUBLIC_CONTACT_EMAIL` y ajustes opcionales del pool
(`DB_POOL_MAX`, etc.).

## Estructura

```
app/            Rutas Next.js (público, /admin, /cliente) + API bajo app/api/
lib/            Lógica de servidor: auth, productos, facturación, ventas, etc.
prisma/         schema.prisma, migrations/, seed.ts
public/         Estáticos servidos por Next
ops/            Backups, watchdog y utilidades del servidor Windows
.github/        Workflow CI (build + lint + tests)
```

## Escáner de códigos de barras (/admin)

- Usa `BarcodeDetector` nativo cuando existe (Chrome/Edge Android y desktop).
- En Safari/iOS y Firefox cae a **ZXing** (carga diferida), que decodifica
  EAN-13/8, UPC-A/E, Code128/39, ITF, Codabar y QR.
- La cámara exige **contexto seguro**: HTTPS (o `localhost`). Abriendo el
  panel por `http://IP` el navegador bloquea `getUserMedia`; el sitio sirve
  HSTS y el escáner muestra un aviso claro si falta HTTPS.
- CSP incluye `media-src 'self' blob:` para permitir el video del escáner.
- Si la detección falla, el código siempre puede teclearse a mano.

## Convenciones

- Validación de entrada en `lib/*.js` (nunca confiar en el body de la API).
- Sesiones firmadas con `SESSION_SECRET`; roles/permisos en `lib/permisos.js`.
- No versionar `.env`, logs, capturas ni respaldos (ver `.gitignore`).

### Revisión funcional del panel

La cobertura, correcciones y límites de la auditoría local están en
[`docs/auditoria-panel-2026-10-29.md`](docs/auditoria-panel-2026-10-29.md).

### Resumen adaptativo por permisos

El panel ofrece un resumen de las áreas que la cuenta puede leer, incluidos
roles personalizados, sin otorgar reportes globales por mostrar esa pantalla.
Los importes consolidados requieren `reportes:read` y lectura de su área;
Bodega conserva sus indicadores operativos sin ventas ni costos ajenos.
Las cifras se agregan en el servidor, incluyen facturas fiscales sin duplicar
históricos y mantienen separadas monedas, cotizaciones y cobros confirmados.
Consulta el alcance, pruebas y límites en
[`docs/resumen-adaptativo-por-permisos-2026-10-31.md`](docs/resumen-adaptativo-por-permisos-2026-10-31.md).

### Listados y configuración empresarial

Trabajadores, Roles, Categorías, Sucursales y Clientes muestran sólo su píldora
de sección; sus filtros se eligen en selectores. CAI, serie, rango, vigencia y
emisor se administran exclusivamente en **Ajustes**, con lectura y escritura
de ese módulo, revisión de cambios y protección de numeración. La factura
explica dentro de la emergente qué falta, el envío y su resultado; el borrador
conserva una referencia para recuperar reintentos sin duplicar la operación.
Las nuevas emisiones fijan los datos del emisor/autorización al guardarse.
Consulta requisitos, compatibilidad y pruebas en
[`docs/filtros-ajustes-emision-2026-10-31.md`](docs/filtros-ajustes-emision-2026-10-31.md).
