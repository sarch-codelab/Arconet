# Incidente: 502, ChunkLoadError y preload

## Diagnóstico y límites

Un `502` al solicitar tanto `/api/ordenes` como `/_next/static/chunks/*.js` y el manifest indica que el gateway no obtiene una respuesta válida del upstream. El `ChunkLoadError` es consecuencia de no descargar JavaScript, no un fallo de TOTP o de la animación del tema. El aviso de un preload no consumido no provoca esos 502 y también puede aparecer cuando la descarga/renderización se interrumpe.

Se encontró en el código una causa reproducible de indisponibilidad: `deploy.ps1` detenía Next **antes** de instalar, generar Prisma y compilar. Durante toda esa preparación el proxy no tenía upstream. Además, al terminar se borraba el build anterior y sus chunks: una pestaña abierta podía pedir módulos lazy que ya no existían. Este último caso suele dar 404 tras el reinicio, no explica por sí solo un 502.

No se accedió al servidor Windows/ZeroTier, a Cloudflare ni a los logs de producción desde esta sesión. Por tanto, no se puede atribuir retrospectivamente cada 502 a ese despliegue ni descartar procesos caídos, OOM, túnel o conectividad. Si los 502 continúan fuera de una promoción, hay que correlacionar la hora con los logs del origen/proxy.

## Corrección del despliegue

1. Lock exclusivo compartido con el watchdog; se libera al cerrar el proceso, por lo que un archivo viejo no bloquea.
2. `git fetch` y `git archive` del commit objetivo en `C:\arconet\candidate`. No se modifica el código, `.next`, `node_modules` ni Prisma generado del proceso vivo.
3. Copiar solo los archivos de entorno conocidos, instalar dependencias **incluidas las de compilación** y construir en el candidato mientras la versión activa sigue disponible. Una preparación fallida no detiene la app.
4. Retener hasta siete días de archivos inmutables de `.next/static`, sin sobrescribir el nuevo build ni copiar bundles privados del servidor. Se conserva la fecha original para que la retención no crezca indefinidamente.
5. Instalar las copias versionadas de arranque/watchdog/poller en `boot`, detener el proceso, aplicar migraciones y promover código + `.next` + `node_modules` + `generated` juntos. Las migraciones siguen siendo obligatorias, nunca se continúa si fallan.
6. Comprobar HTML, `/api/health` (incluye PostgreSQL), manifest y un chunk JavaScript real antes de declarar éxito.
7. Si falla la promoción, restaurar los artefactos movidos y el commit anterior; volver a arrancar y marcar el despliegue como fallido. El runtime anterior se conserva en `C:\arconet\previous` hasta el próximo despliegue. El rollback **no revierte migraciones de BD**: deben ser compatibles hacia atrás o requerir una ventana/migración operativa específica.
8. Borrar el candidato y sus copias de `.env` al terminar normalmente o por excepción. Si se mata el proceso o el servidor pierde energía, comprobar y retirar ese workspace antes de una recuperación manual.

Cada build lleva su commit en `NEXT_DEPLOYMENT_ID` y `.next/DEPLOYMENT_ID`. El arranque restaura ese ID incluso tras reiniciar Windows. Next puede detectar versiones distintas en navegaciones y cargar la página coherente con el servidor. La retención cubre también los módulos lazy dentro de una página abierta.

**No es un despliegue sin interrupciones**: sigue existiendo una ventana para detener, migrar, mover artefactos y arrancar el único upstream. Elimina la instalación/compilación de esa ventana. Cero interrupción requiere dos upstreams y cambio de tráfico en el proxy, fuera de esta corrección. También se necesita RAM para servir y compilar simultáneamente, y espacio para candidato, activo y respaldo de dependencias/build.

`-SkipBuild` y `-SkipInstall` se rechazan explícitamente: reutilizar artefactos de otro commit rompería las garantías. Un repositorio sucio o con commits ajenos al objetivo aborta, sin stash automático ni pérdida de trabajo. Un lock ocupado devuelve 2; el poller lo trata como ocupado y reintenta en la próxima pasada.

## Recuperación del navegador

Los boundaries de ruta y de sección distinguen los errores de importación. Ante un chunk fallido ofrecen **Recargar página**, con aviso de pérdida de cambios sin guardar. La recarga solo sucede al pulsar: no hay bucles automáticos, limpieza de cookies ni reenvío de órdenes. Otros errores mantienen el reintento local del componente.

Remontar el mismo `React.lazy` no recupera un import rechazado porque React y/o el bundler conservan la promesa fallida. La recarga explícita obtiene el runtime y los módulos vigentes.

## Validación realizada

- ESLint sin advertencias, compilación de producción y 125 archivos / 1486 pruebas aprobados.
- Sintaxis de los cuatro scripts PowerShell analizada con tree-sitter; no es una ejecución de Windows PowerShell.
- Smoke local con un build de producción trasladado a otro directorio y PostgreSQL aislado: HTML, API/BD, manifest, 16 chunks actuales con Content-Type JavaScript, un chunk retenido del build anterior y `deploymentId` correctos. `/api/ordenes` sin sesión responde 401, no 502. El proceso y la base temporal se detuvieron al finalizar.

## Comprobación operativa antes de publicar

Las pruebas de Node verifican la retención real de archivos y el comportamiento de recuperación; los contratos de despliegue verifican orden/guardias/rollback en el script. **No sustituyen una ejecución de promoción y rollback en Windows**. Probar en staging Windows, incluidos build fallido, migración fallida, arranque fallido y lock ocupado, antes de desplegar este cambio de operación.

Para investigar el origen, en el servidor:

```powershell
Get-Content C:\arconet\deploy.log -Tail 100
Get-Content C:\arconet\logs\app.err.log -Tail 100
Get-Content C:\arconet\logs\arconet-watchdog.log -Tail 50
Invoke-WebRequest http://127.0.0.1:3000/api/health -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:3000/manifest.webmanifest -UseBasicParsing
```

Comparar hora de caída y despliegue. Si el origen responde y el dominio público da 502, revisar túnel/proxy; si el origen no responde, revisar proceso, memoria y arranque. No compartir `.env`, cookies, tokens ni volcados de órdenes al solicitar esos logs.
