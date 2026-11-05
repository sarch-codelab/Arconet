# Incidente: chunk de `/admin` como `500 text/plain` y `ChunkLoadError`

## Mensaje reportado

```
Failed to load resource: the server responded with a status of 500 ()
Refused to execute script from 'https://arconethn.com/_next/static/chunks/app/admin/page-35ba7fb606cae04f.js?dpl=5eb1531d...'
because its MIME type ('text/plain') is not executable, and strict MIME type checking is enabled.
ChunkLoadError: Loading chunk 3698 failed.
[arconet] error en la vista: ChunkLoadError: Loading chunk 3698 failed.
12 The resource <URL> was preloaded using link preload but not used within a few seconds...
```

El `500` y el `ChunkLoadError` son el mismo incidente: el navegador pidió un
chunk JavaScript y obtuvo una respuesta `500` con `Content-Type: text/plain`.
Chrome se niega a ejecutarla por MIME estricto, Webpack rechaza la importación
diferida y el boundary de ruta muestra «Recargar página». Los avisos de preload
sin consumir tenían dos causas: la página se interrumpió antes de usar esos
recursos **y** React 19 estaba emitiendo preloads huérfanos del logo en todas
las páginas. `net::ERR_BLOCKED_BY_CLIENT` lo produce una extensión del
navegador (bloqueador de publicidad) sobre una de esas precargas; no viene del
servidor y no se puede arreglar desde el código, pero al reducir las precargas
de 7 a 1–3 por página desaparece casi todo el ruido.

## Diagnóstico

El sufijo `?dpl=<sha>` lo añade Next cuando se construye con
`NEXT_DEPLOYMENT_ID`. Según la documentación de `deploymentId`, Next **no lee**
ese parámetro en las peticiones entrantes: sólo sirve para romper cachés de
navegador/CDN. `deploy.ps1` lo fijaba al SHA de cada commit, de modo que en
**cada despliegue todos los assets cambiaban de URL** y había que volver a
descargarlos justo en la ventana en que se detiene, migra y reinicia el único
upstream. Un proxy o CDN puede quedarse con una respuesta de error para una de
esas URLs y seguir sirviéndola como `text/plain`.

Además, `Assert-Healthy` sólo pedía **un** chunk de la home. Un chunk de otra
ruta (precisamente `app/admin/page-*.js`) podía faltar, estar vacío o responderse
mal sin que el despliegue lo detectara.

No se accedió al servidor Windows ni a los logs de Cloudflare: no se puede
atribuir ese `500` concreto a un componente de la infraestructura. Las medidas
siguientes eliminan el patrón de URL que lo disparó y hacen que un build con un
chunk malo **no llegue a promoverse**.

## Cambios

1. **Sin `?dpl=`**. `next.config.mjs` elimina `NEXT_DEPLOYMENT_ID` del entorno
   (aunque el servidor lo herede), y `deploy.ps1` / `ops/start-arconet.ps1`
   dejan de fijarlo y de escribir/leer `.next/DEPLOYMENT_ID`. Los chunks llevan
   hash en el nombre y `ops/retain-static-assets.mjs` conserva los de los
   builds anteriores siete días: son inmutables, no necesitan re-descargarse y
   las pestañas abiertas siguen encontrando sus módulos. Next detecta el cambio
   de versión por `BUILD_ID` y recarga cuando hace falta. Next ignora el query
   de las URLs antiguas con `?dpl=`, así que apuntan al mismo archivo; si ese
   archivo ya falta en el runtime activo, la corrección no lo recrea y la
   pestaña vieja necesita una recarga manual.
2. **`ops/verify-static-assets.mjs`** recorre el HTML prerenderizado, comprueba
   en disco que cada `/_next/static/*.js|css` referenciado existe y no está
   vacío, y exige el chunk `app/admin/page-*.js` (que al renderizarse bajo
   demanda no aparece en el HTML estático). Lo ejecutan CI y `deploy.ps1`
   **antes** de detener la app activa.
3. **`Assert-Healthy`** ahora pide `/`, `/admin`, `/contacto` y `/tienda`,
   rechaza cualquier `?dpl=`, y solicita **todos** los chunks JavaScript
   referenciados por esas páginas exigiendo `200` y `Content-Type` JavaScript.
   Un `500 text/plain` activa el rollback existente en lugar de llegar a los
   usuarios.
4. **Build sin red para Prisma**. `scripts/prisma-cli.mjs` apunta
   `PRISMA_SCHEMA_ENGINE_BINARY` al motor WASM que trae el propio paquete
   (`node_modules/prisma/build/schema_engine_bg.wasm`) para `generate` y
   `validate`. `npm run build` y el paso de validación de CI ya no dependen de
   `binaries.prisma.sh`. **No** se aplica a `migrate deploy`: ese comando
   ejecuta el motor como proceso y un `.wasm` no es ejecutable; las migraciones
   siguen usando el binario nativo instalado por `npm ci` en el servidor.
5. Se adoptó la corrección de coordenadas del mapa de `/contacto` ya publicada
   en `main` (`15.5088, -88.0307`), para no revertirla con esta rama.
6. **Un solo preload de imagen por vista**. Había dos fuentes de preloads
   huérfanos. Nueve componentes tenían dos o más `<Image priority>` (el hero y
   el logo; en `/tienda` hasta cuatro, dos veces el mismo `/arconet.png` y uno
   dentro de un modal oculto). Y, sobre todo, **React 19 precarga
   automáticamente en SSR cualquier `<img>` que no sea `loading="lazy"` ni
   `fetchPriority="low"`**: quitar `priority` no bastaba, los logos seguían
   emitiendo 2–3 `<link rel="preload" as="image">` por página, incluido el del
   overlay de transición que está escondido. Se deja `priority` **solo** en la
   imagen LCP de cada vista, las imágenes del modal pasan a `lazy` y todos los
   logos llevan `fetchPriority="low"` (siguen cargándose eager, pero React ya
   no los precarga). Medido en el build: `/` y `/contacto` pasan de 6 y 5
   preloads a 3, `/tienda` de 4 a 2 y `/admin` de 3 a 1, con **cero** preloads
   del logo.
7. **`Assert-Healthy` comprueba también todos los `.js` que hay en disco**.
   En producción el archivo `app/admin/page-*.js` existía en `.next` y aun así
   respondía `500 text/plain`, así que revisar únicamente las URLs del HTML no
   bastaba. Ahora se pide por HTTP cada chunk del directorio promovido y se
   exige `200` + MIME JavaScript; si uno falla, el deploy hace rollback.
8. **El poller ya no se queda colgado**. `ops/poller.ps1` trataba
   `LastTaskResult = 267009` (`SCHED_S_TASK_RUNNING`) como «deploy en curso»
   aunque la tarea ya hubiera terminado, lo que bloquea **todos** los despliegues
   posteriores. Ahora solo bloquea cuando `State -eq 'Running'`, registra el
   resultado residual y reintenta un commit fallido después de 30 minutos en
   lugar de esperar eternamente un commit nuevo.

No se cambió la recuperación del navegador: ante un `ChunkLoadError` se sigue
ofreciendo «Recargar página» con aviso de pérdida de cambios, sin recargas
automáticas que pudieran tirar un formulario del panel sin guardar.

## Validación

- ESLint, pruebas Vitest y `npm run build` (con el cliente real de Prisma, sin
  stub) aprobados.
- Build de producción con `NEXT_DEPLOYMENT_ID` **fijado a propósito** para
  comprobar que, aun así, el HTML no contiene `?dpl=`.
- Servidor `next start` local: `/`, `/admin`, `/contacto` y `/tienda` en 200;
  todos sus chunks JavaScript en 200 con `Content-Type` JavaScript; sin
  `?dpl=` en el HTML.
- Pruebas con fixtures que simulan un chunk ausente, uno vacío y la ausencia
  del chunk de `/admin`: la verificación falla en los tres casos.
- Pruebas nuevas que impiden volver a precargar el logo (exigen
  `fetchPriority="low"` en todos) y limitan a una imagen `priority` por vista;
  `npm run lint` 0 y 1569 pruebas en 139 archivos, 0 fallos.
- Build local de producción: `/tienda` referencia 15 chunks y **ninguno** es
  `app/admin/page-*.js`; ese chunk solo aparece en el HTML de `/admin`. El error
  en `tienda:1` se produce al navegar al panel con el router cliente: el
  documento sigue siendo `/tienda` mientras Webpack inyecta el script de
  `/admin`.

## Límites y verificación en producción

No se ejecutó la promoción/rollback en Windows ni se inspeccionó la caché de
Cloudflare, por lo que el `500` concreto no se atribuye a un componente de
infraestructura. Lo que sí se pudo comprobar desde fuera, ya con el PR #104 y
#105 fusionados:

- `https://arconethn.com/api/health` respondía `status: ok`, `db: up`, con
  `uptimeSeconds` de algo más de tres horas: el proceso Node **no** se había
  reiniciado desde el despliegue de `5eb1531`.
- `/contacto` seguía emitiendo `?dpl=5eb1531...` en las imágenes optimizadas.
- El directorio de estáticos activo está **incompleto y mezclado**: con el
  `?dpl=` del build vigente, `webpack-30e4ae19cdd564e9.js`,
  `8500-63a4afbeacab3b52.js` y `1573-c27e6ab999544105.js` devolvían JavaScript
  `200`, mientras `3794-5216a31ea0e6bfdd.js` y
  `app/admin/page-35ba7fb606cae04f.js` devolvían `500 Internal Server Error`
  con `text/plain`, y `error-bc4ba6c4f6b2ea60.js` devolvía `404`. Una ruta
  inexistente cualquiera devuelve `404`, así que no es una regla de WAF contra
  `/admin/`: son archivos concretos que el runtime ya no puede servir.

Eso confirma dos cosas: el `500` **no** lo causa la caché del navegador ni el
usuario, y el despliegue del servidor sigue pendiente. El servidor es *pull* por
`ArconetDeployPoll` (cada 5 min, detrás de ZeroTier) y GitHub Actions solo
compila: no existe ningún workflow que pueda activar el deploy desde aquí.

Para forzarlo y confirmarlo, **en el servidor Windows, como administrador**:

```powershell
# 1) Quitar un bloqueo de poller que pudiera haber quedado de un deploy fallido
Remove-Item C:\arconet\logs\arconet-poller.state -ErrorAction SilentlyContinue
# 2) Actualizar los scripts de arranque/poller por si la copia de boot es vieja
Copy-Item C:\arconet\app\ops\*.ps1 C:\arconet\boot\ -Force
# 3) Lanzar el despliegue directamente, sin esperar al poll de 5 minutos
schtasks /run /tn "ArconetDeploy"
# 4) Seguir el resultado
Get-Content C:\arconet\deploy.log -Tail 40 -Wait
```

El `deploy.log` debe mostrar `Static assets OK` y
`Health check completo: N chunks JavaScript 200 (... + todos los del disco)`.
Después, `https://arconethn.com/contacto` ya no debe contener `?dpl=`,
`/api/health` debe tener un `uptimeSeconds` pequeño y el chunk de `/admin` debe
responder JavaScript. Si sigue sin arrancar, revisar
`C:\arconet\logs\arconet-poller.log`, que el árbol de `C:\arconet\app` esté
limpio (`git status --porcelain`) y que `git fetch origin main` funcione como
SYSTEM. El deploy, al construir un `.next` nuevo en un candidato aislado,
reemplaza por completo el directorio de estáticos corrupto.

Aunque la causa última hubiera sido un chunk ausente y no el sufijo de caché,
las barreras nuevas cubren ese caso: `verify-static-assets.mjs` exige el chunk
de `/admin` antes de promover y `Assert-Healthy` pide por HTTP **todos** los
chunks del disco. Un `500 text/plain` ya no puede llegar a promoverse.
