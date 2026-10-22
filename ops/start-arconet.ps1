<#
.SYNOPSIS
    Arranque automatico de Arconet (Next.js, puerto 3000).

.DESCRIPTION
    Script idempotente y a prueba de fallos:
      - Si la app ya esta viva y responde HTTP 200, no hace nada.
      - Limpia instancias zombie del proyecto.
      - Arranca `next start` con node.exe (NO con `npm`, que en Windows
        resuelve a "C:\Program Files\nodejs\npm" sin extension y lo abre
        con el Bloc de notas en lugar de ejecutarlo).
      - Espera a que el puerto 3000 responda HTTP 200, con reintentos.
      - Escribe logs en C:\arconet\logs\ y el PID real en C:\arconet\app.pid.
      - Devuelve codigo de salida != 0 si la app no levanta, para que
        Task Scheduler lo detecte y pueda reintentar.

.NOTES
    Vive FUERA del repositorio git (C:\arconet\boot) a proposito: el script
    de deploy ejecuta `git reset --hard` y `git stash`, y un `git clean`
    borraria cualquier script versionado dentro de C:\arconet\app.
#>

[CmdletBinding()]
param(
    [int] $Port        = 3000,
    [int] $MaxAttempts = 6,
    [int] $WaitSeconds = 8
)

$ErrorActionPreference = 'Stop'

$AppPath = 'C:\arconet\app'
$LogDir  = 'C:\arconet\logs'
$PidFile = 'C:\arconet\app.pid'
$NodeExe = 'C:\Program Files\nodejs\node.exe'
$NextBin = Join-Path $AppPath 'node_modules\next\dist\bin\next'
$BuildDir = Join-Path $AppPath '.next'

$LogFile = Join-Path $LogDir 'arconet-boot.log'
$OutLog  = Join-Path $LogDir 'app.out.log'
$ErrLog  = Join-Path $LogDir 'app.err.log'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-Log {
    param([string] $Message, [string] $Level = 'INFO')
    $line = '[{0}] [{1}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
    Write-Host $line
}

function Get-AppProcess {
    # Un usuario sin privilegios NO puede leer CommandLine de un proceso de
    # SYSTEM, asi que la deteccion principal es el propietario del socket
    # que escucha en el puerto de la app.
    $ids = New-Object System.Collections.Generic.HashSet[int]

    try {
        Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
            ForEach-Object { [void]$ids.Add([int]$_.OwningProcess) }
    } catch { }

    if (Test-Path $PidFile) {
        $raw = (Get-Content $PidFile -Raw -ErrorAction SilentlyContinue).Trim()
        if ($raw -match '^\d+$') { [void]$ids.Add([int]$raw) }
    }

    Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine -notmatch 'pm2' -and
                       ($_.CommandLine -match 'arconet' -or $_.CommandLine -match '[\\/]next[\\/]dist[\\/]bin') } |
        ForEach-Object { [void]$ids.Add([int]$_.ProcessId) }

    @($ids | Where-Object { $_ -gt 0 } | ForEach-Object {
        Get-CimInstance Win32_Process -Filter "ProcessId=$_" -ErrorAction SilentlyContinue
    })
}

function Test-AppHealthy {
    param([int] $CheckPort = 3000)
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$CheckPort/" -UseBasicParsing -TimeoutSec 6
        return ($r.StatusCode -eq 200)
    } catch {
        return $false
    }
}

Write-Log "=== Arranque Arconet (script PID $PID, usuario '$env:USERNAME') ==="

# --- 0) Si ya esta arriba y sano, no tocar nada -----------------------------
$existing = @(Get-AppProcess)
if ($existing.Count -gt 0 -and (Test-AppHealthy -CheckPort $Port)) {
    $existing[0].ProcessId | Out-File -FilePath $PidFile -Encoding ascii
    Write-Log "App ya activa y saludable (PID $($existing[0].ProcessId)) - nada que hacer"
    exit 0
}

# --- 1) Limpiar instancias previas -----------------------------------------
$stale = @(Get-AppProcess)
if ($stale.Count -gt 0) {
    foreach ($p in $stale) {
        Write-Log "Deteniendo instancia previa PID $($p.ProcessId)"
        try {
            Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
        } catch {
            Write-Log "No se pudo detener el PID $($p.ProcessId) (privilegios insuficientes)" 'WARN'
        }
    }
    Start-Sleep -Seconds 2
}

# Si el puerto sigue ocupado por un proceso que no podemos detener, no hay
# nada mas que hacer aqui: es mejor fallar con un mensaje claro que levantar
# una segunda instancia que muere con EADDRINUSE.
$stillBusy = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
if ($stillBusy.Count -gt 0) {
    Write-Log "El puerto $Port sigue ocupado por el PID $($stillBusy[0].OwningProcess) y no se pudo detener (privilegios insuficientes). Ejecuta este script como Administrador." 'ERROR'
    exit 6
}

# --- 2) Requisitos ----------------------------------------------------------
if (-not (Test-Path $NodeExe)) {
    Write-Log "FALTA node.exe en '$NodeExe'" 'ERROR'
    exit 2
}
if (-not (Test-Path $NextBin)) {
    Write-Log "FALTA el binario de next en '$NextBin' (ejecuta npm ci)" 'ERROR'
    exit 2
}
if (-not (Test-Path $BuildDir)) {
    Write-Log "FALTA el build .next en '$BuildDir' (ejecuta npm run build)" 'ERROR'
    exit 2
}

# --- 3) Arrancar ------------------------------------------------------------
$env:NODE_ENV = 'production'
$env:PORT = "$Port"
$env:NEXT_TELEMETRY_DISABLED = '1'

try {
    $proc = Start-Process -FilePath $NodeExe `
        -ArgumentList @("`"$NextBin`"", 'start', '-p', "$Port") `
        -WorkingDirectory $AppPath `
        -RedirectStandardOutput $OutLog `
        -RedirectStandardError $ErrLog `
        -WindowStyle Hidden `
        -PassThru
} catch {
    Write-Log "No se pudo lanzar el proceso: $($_.Exception.Message)" 'ERROR'
    exit 3
}

Write-Log "Proceso arrancado PID $($proc.Id) -> $OutLog"
$proc.Id | Out-File -FilePath $PidFile -Encoding ascii

# --- 4) Esperar que responda ------------------------------------------------
for ($i = 1; $i -le $MaxAttempts; $i++) {
    Start-Sleep -Seconds $WaitSeconds

    if ($proc.HasExited) {
        Write-Log "El proceso termino inesperadamente (codigo $($proc.ExitCode))" 'ERROR'
        Get-Content $ErrLog -Tail 25 -ErrorAction SilentlyContinue |
            ForEach-Object { Write-Log "  stderr: $_" 'ERROR' }
        exit 4
    }

    if (Test-AppHealthy -CheckPort $Port) {
        Write-Log "OK - Arconet responde HTTP 200 en el puerto $Port (PID $($proc.Id))"
        exit 0
    }

    Write-Log "Intento $i de ${MaxAttempts}: la app aun no responde en el puerto $Port"
}

Write-Log "FALLO - Arconet no respondio HTTP 200 en el puerto $Port tras $MaxAttempts intentos" 'ERROR'
Get-Content $ErrLog -Tail 25 -ErrorAction SilentlyContinue |
    ForEach-Object { Write-Log "  stderr: $_" 'ERROR' }
exit 5
