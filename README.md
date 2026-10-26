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

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | `prisma generate` + `next dev` |
| `npm run build` | `prisma generate` + `next build` |
| `npm start` | Servidor de producción |
| `npm run lint` | ESLint (next/core-web-vitals) |
| `npm run test` | Tests con Node:test (`node --test`) |
| `npm run db:generate` | Regenera el cliente Prisma |
| `npm run db:migrate` | Aplica migraciones pendientes |
| `npm run db:seed` | Carga datos semilla (`prisma/seed.ts`) |
| `npm run db:studio` | Abre Prisma Studio |

## Variables de entorno

Ver `.env.example` con todas y su descripción. Resumen: `DATABASE_URL`,
`SESSION_SECRET`, `APP_ORIGIN`, bloque SMTP (`SMTP_HOST/PORT/USER/PASS`,
`EMAIL_FROM`), `NEXT_PUBLIC_CONTACT_EMAIL` y ajustes opcionales del pool
(`DB_POOL_MAX`, etc.).

| Variable | ¿Obligatoria? | Para qué |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Conexión a PostgreSQL (app y Prisma). |
| `SESSION_SECRET` | Sí | Firma las cookies de sesión. **64 caracteres hexadecimales**; generarlo con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Con `NODE_ENV=production` la app no arranca si conserva el valor de ejemplo de `.env.example`; en desarrollo solo muestra un aviso. |
| `SEED_ADMIN_PASSWORD` | Solo para `npm run db:seed` | Contraseña inicial de los usuarios admin que crea el seed (`admin@arconet.com`). **Mínimo 12 caracteres.** Si falta o es más corta, el seed aborta **antes de escribir nada** en la base: no queda una base a medio sembrar sin usuario de admin. Se cambia después desde el panel. |
| `APP_ORIGIN` | Recomendada | Origen canónico para metadata, sitemap, robots y enlaces de correo. |
| `SMTP_*`, `EMAIL_FROM` | Para enviar correo | Correo transaccional (cotizaciones, avisos). |
| `ARCONET_BACKUP_DIR` | Solo `ops/backup-db.mjs` | Directorio donde se escriben los respaldos. |

Si no tenés un `.env` todavía: `cp .env.example .env` y completá los valores
(sobre todo `SEED_ADMIN_PASSWORD` y `SESSION_SECRET`, que traen un placeholder).

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
