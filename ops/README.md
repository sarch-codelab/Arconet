# Operacion de Arconet en el servidor Windows

Estos scripts son los que mantienen la aplicacion Arconet encendida en
`C:\arconet` (Windows Server, PM2 no se usa en el servidor).

## Estructura en el servidor

| Ruta                          | Contenido                                        |
|-------------------------------|--------------------------------------------------|
| `C:\arconet\app`              | Codigo de la app Next.js (este repo)             |
| `C:\arconet\boot\*.ps1`       | Scripts de operacion instalados (copia de `ops/`)|
| `C:\arconet\logs\`            | Logs de arranque, watchdog y stdout/stderr       |
| `C:\arconet\backups\`         | Dumps de PostgreSQL (tarea diaria 02:00)         |
| `C:\arconet\app\.media\`      | Fotografias del panel (fuera de git; ver abajo)  |

## Tareas programadas

| Tarea                 | Cuando                        | Que hace                                      |
|-----------------------|-------------------------------|-----------------------------------------------|
| `ArconetApp`          | Al iniciar Windows (+1 min)    | Levanta la app (SYSTEM, reintenta 3 veces)    |
| `ArconetWatchdog`     | Cada 5 minutos                | Comprueba el HTTP y relanza si esta caida     |
| `ArconetStop`         | A demanda                     | Detiene la app (se usa desde el deploy)       |
| `ArconetDeploy`       | A demanda                     | Ejecuta `deploy.ps1` como SYSTEM              |
| `ArconetDeployPoll`   | Cada 5 minutos                | Si `origin/main` avanzo, lanza `ArconetDeploy`|
| `Backup Arconet`      | Diaria 02:00                  | `pg_dump -Fc` + rotacion de 14 dias           |

## Despliegue

Este servidor esta en ZeroTier y **no tiene IP publica**, asi que un runner de
GitHub Actions no puede alcanzarlo. Por eso el deploy es *pull*, no *push*:

1. Se empuja a `main` en GitHub (desde donde sea).
2. `ArconetDeployPoll` revisa `origin/main` cada 5 minutos.
3. Si hay commits nuevos y el arbol esta limpio, lanza `ArconetDeploy`, que
   ejecuta `deploy.ps1`: snapshot en candidato aislado -> instalar/compilar
   mientras la app sigue activa -> retener assets -> parar -> migrar -> promover
   codigo y runtime -> arrancar -> comprobar HTML, API/BD, manifest y chunk.
   El watchdog no compite con la promocion y el runtime anterior se conserva.

Ver [diagnostico y limites de 502/ChunkLoadError](../docs/502-chunk-recovery.md),
incluida la validacion necesaria en staging Windows antes de publicar cambios
al despliegue. Sigue existiendo una ventana corta de cambio del unico upstream.

El workflow `.github/workflows/ci.yml` solo compila (`npm ci` + `build`) para
avisar temprano si el codigo no construye.

Salvaguardas del poller (`ops/poller.ps1`):

* No despliega si hay cambios sin commitear en el servidor.
* No despliega si `HEAD` tiene commits que no estan en `origin/main` (el
  `git reset --hard` del deploy los borraria).
* Si un commit falla, no lo reintenta hasta que aparezca uno nuevo
  (`C:\arconet\logs\arconet-poller.state`).

Deploy manual:

```powershell
schtasks /run /tn "ArconetDeploy"
Get-Content C:\arconet\deploy.log -Tail 30 -Wait
```


## Fotografias (`.media`)

Las fotos de productos, clientes, trabajadores y usuarios **no viven en la base
de datos**. Antes se guardaban como data URL (base64) dentro de la columna, y
eso hacia que el listado de productos pesara 16.8 MB con 16 fotos y que cada
respaldo de PostgreSQL arrastrara todas las imagenes. Ahora se escribe el
archivo en disco y en la columna queda solo su ruta:

```
/media/productos/adss-12-1-a1b2c3d4e5f60718.png
```

* El directorio es `C:\arconet\app\.media\` (subcarpetas `productos`,
  `clientes`, `trabajadores`, `usuarios`, `categorias`).
* **Esta dentro de `C:\arconet\app` pero fuera de git** (`.gitignore`). Eso es
  a proposito: el deploy hace `git reset --hard`, que borraria cualquier cosa
  versionada, y un `git clean` borraria lo ignorado. Si algun dia se limpia el
  repo a mano, **no borrar `.media`**.
* Se puede mover con la variable de entorno `MEDIA_DIR` (ruta absoluta). Si se
  cambia, hay que mover tambien los archivos y reiniciar la app.
* El nombre lleva un hash del contenido: la misma imagen no se duplica y una
  foto nueva produce una ruta nueva, asi que el navegador la puede cachear
  para siempre (`Cache-Control: immutable`) sin invalidaciones.
* Al reemplazar o borrar un registro, su foto se borra del disco.
* Hay que **incluir `.media` en la copia de seguridad del servidor**: `pg_dump`
  ya no lleva las fotos dentro.

### Migrar las fotos que ya estan en base64

Una sola vez, con la app parada o recien actualizada:

```powershell
cd C:\arconet\app
npx tsx ops/migrar-fotos.mjs --dry-run   # cuanto va a mover, sin tocar nada
npx tsx ops/migrar-fotos.mjs             # escribe los archivos y actualiza la base
```

Es idempotente: si se ejecuta otra vez no encuentra nada que migrar. Recorre
productos (foto y galeria), clientes, trabajadores y usuarios. Las rutas del
catalogo (`/catalogo/...`) y las URL externas se dejan como estan.

## Instalacion en un servidor nuevo

```powershell
# 1. Copiar el repo en C:\arconet\app
# 2. PowerShell COMO ADMINISTRADOR:
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\setup-elevated.ps1
```

El script copia `ops\*.ps1` a `C:\arconet\boot` y registra las seis tareas.

## Verificacion tras un reinicio

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\arconet\boot\post-boot-check.ps1
```

Comprueba puerto 3000, HTTP 200, que el arranque haya sido como SYSTEM y
posterior al boot, el watchdog y la existencia de las seis tareas.

## Comandos utiles

```powershell
# Estado (proceso, HTTP, tareas, logs)
powershell -NoProfile -ExecutionPolicy Bypass -File .\status.ps1

# Reinicio manual
powershell -NoProfile -ExecutionPolicy Bypass -File .\stop-app.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-app.ps1

# Forzar el reinicio aunque la tarea no sea accesible
schtasks /run /tn "ArconetStop"
schtasks /run /tn "ArconetApp"
```

## Correo transaccional

Los códigos de recuperación de contraseña y de verificación de correo salen
por SMTP. Se configuran en el `.env` del servidor:

| Variable      | Ejemplo                    | Uso                                   |
|---------------|----------------------------|---------------------------------------|
| `SMTP_HOST`   | `smtpout.secureserver.net` | Servidor SMTP del relé                |
| `SMTP_PORT`   | `465`                      | `465` activa TLS directo               |
| `SMTP_USER`   | `no-reply@arconethn.com`   | Usuario autenticado                   |
| `SMTP_PASS`   | *(contraseña de aplicación)* | Clave o token del proveedor         |
| `EMAIL_FROM`  | `Arconet <no-reply@arconethn.com>` | Remitente visible            |
| `APP_ORIGIN`  | `https://arconethn.com`    | Enlaces dentro de los correos         |

Sin `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` la app funciona en **modo consola**:
no envía nada y registra el asunto y el cuerpo (incluido el código) en la
bitácora del panel (`Logs → Sistema`, nivel *aviso*). Sirve para probar el
flujo, pero en producción el correo debe estar configurado.

**Estado actual (26/10/2026):** el dominio `arconethn.com` está registrado en
GoDaddy, pero todavía no hay buzón corporativo contratado, así que la app
opera en modo consola. Cuando se contrate el buzón, agregar estas variables
al `.env` del servidor y reiniciar la app. Mientras tanto, los clientes que
olviden su contraseña deben contactar a Arconet por teléfono.

## Notas importantes (bugs ya corregidos)

* **No usar `Start-Process -FilePath "npm"`.** En Windows `npm` resuelve a
  `C:\Program Files\nodejs\npm`, un script bash *sin extension* que Windows
  abre con el Bloc de notas en vez de ejecutarlo. El arranque "terminaba
  bien" (codigo 0) pero la app nunca levantaba. Usar `npm.cmd` o llamar
  directamente a `node node_modules\next\dist\bin\next start`.
* **`Get-Process` no tiene propiedad `CommandLine`.** Para inspeccionar lineas
  de comandos hay que usar `Get-CimInstance Win32_Process`. Y un usuario sin
  privilegios **no** puede leer el `CommandLine` de un proceso de SYSTEM:
  para la app se detecta el proceso por el propietario del socket del
  puerto 3000.
* **El deploy debe detener la app antes de `npm ci`**, si no falla con
  `EPERM` al borrar `node_modules`.
* **Las tareas creadas como SYSTEM no son visibles sin elevar.** El token de
  un administrador esta filtrado por UAC, asi que `schtasks /query` devuelve
  "Acceso denegado" y `Get-ScheduledTask` no las lista. Por eso
  `setup-elevated.ps1` les pone un descriptor de seguridad que concede
  control total al SID del usuario. Si vuelven a dar "Acceso denegado", el
  sintoma se parece mucho a "la tarea desaparecio": comprobar con
  `schtasks /query /tn <tarea>` desde una consola **elevada** antes de
  asumir que se borro.
