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
diferida y el boundary de ruta muestra «Recargar página». El aviso de preload
sin consumir es consecuencia de que la página se interrumpió antes de usar esos
recursos; no es una causa independiente y no se desactivan preloads.

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
   de versión por `BUILD_ID` y recarga cuando hace falta. Las URLs antiguas con
   `?dpl=` siguen funcionando porque Next ignora el query y los archivos se
   retienen.
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

## Límites

No se ejecutó la promoción/rollback en Windows ni se inspeccionó la caché de
Cloudflare: si el `500` estaba cacheado para la URL con `?dpl=`, las páginas
nuevas ya no la piden, pero una pestaña vieja que conserve el HTML anterior
podría necesitar una recarga manual. La fusión del PR no equivale a confirmar
que el servidor haya activado el nuevo build; hay que revisar `deploy.log` y el
`Assert-Healthy` del siguiente despliegue.
