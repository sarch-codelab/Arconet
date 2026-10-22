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

| Tarea             | Cuando                        | Que hace                                      |
|-------------------|-------------------------------|-----------------------------------------------|
| `ArconetApp`      | Al iniciar Windows (+1 min)    | Levanta la app (SYSTEM, reintenta 3 veces)    |
| `ArconetWatchdog` | Cada 5 minutos                | Comprueba el HTTP y relanza si esta caida     |
| `ArconetStop`     | A demanda                     | Detiene la app (se usa desde el deploy)       |
| `Backup Arconet`  | Diaria 02:00                  | `pg_dump -Fc` + rotacion de 14 dias           |

## Instalacion en un servidor nuevo

```powershell
# 1. Copiar el repo en C:\arconet\app
# 2. PowerShell COMO ADMINISTRADOR:
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\setup-elevated.ps1
```

El script copia `ops\*.ps1` a `C:\arconet\boot` y registra las cuatro tareas.

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
