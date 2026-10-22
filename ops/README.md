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
   ejecuta `deploy.ps1`: parar app -> `git reset --hard` -> `npm ci` ->
   `npm run build` -> arrancar -> comprobar HTTP 200.

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
