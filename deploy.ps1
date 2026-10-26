<# 
.SYNOPSIS
    Deploy script for Arconet Next.js app on Windows server
.DESCRIPTION
    Pulls latest code, builds, and restarts the app.

    Cambios applied:
      - Detiene la ANTES de `npm ci`. Con la app corriendo, npm ci no puede
        borrar node_modules (EPERM) y el deploy abortaba en el paso 3
        (ver deploy.log 2026-10-21 16:22:45).
      - Usa npm.cmd de forma explicita en vez de depender del shim npm.ps1.
      - Arranca con el script de arranque real (C:\arconet\boot\start-arconet.ps1),
        que verifica que la app responde HTTP 200 antes de declarar exito.
#>

param(
    [string]$Branch = "main",
    [switch]$SkipBuild,
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$AppPath = "C:\arconet\app"
$LogFile = "C:\arconet\deploy.log"
$NpmCmd  = "C:\Program Files\nodejs\npm.cmd"
$BootStart = "C:\arconet\boot\start-arconet.ps1"
$BootStop  = "C:\arconet\boot\stop-arconet.ps1"
$BuildDir = Join-Path $AppPath ".next"
$BuildPrevious = Join-Path $AppPath ".next-previous"
$script:AppWasStopped = $false

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Write-Host $logEntry
    Add-Content -Path $LogFile -Value $logEntry
}

# npm escribe avisos (no errores) por stderr. Con $ErrorActionPreference = 'Stop'
# PowerShell convierte ese stderr en una excepcion y el deploy abortaba con
# mensajes como "npm warn install-scripts ...". El resultado real es $LASTEXITCODE.
function Invoke-Npm {
    param([string[]]$NpmArgs)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $NpmCmd @NpmArgs 2>&1 | Tee-Object -FilePath 'C:\arconet\logs\deploy-npm.log' -Append | Out-Null
        return $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $prev
    }
}

# Restaura el build que estaba activo antes del deploy. Se usa cuando el
# build nuevo falla o no arranca, para no dejar el sitio con un .next roto.
function Restore-PreviousBuild {
    param([string]$Reason = "")
    if (-not (Test-Path $BuildPrevious)) { return $false }
    Write-Log "Restaurando build anterior... $Reason" "WARN"
    try {
        if (Test-Path $BuildDir) {
            Remove-Item -Path $BuildDir -Recurse -Force -ErrorAction Stop
        }
        Move-Item -Path $BuildPrevious -Destination $BuildDir -Force -ErrorAction Stop
        return $true
    } catch {
        Write-Log "No se pudo restaurar el build anterior: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Si algo falla, intenta dejar el sitio en pie en vez de dejarlo caido hasta
# que el watchdog reaccione (paso el 22/10 con el fallo de npm ci).
function Fail {
    param([string]$Message)
    Write-Log $Message "ERROR"
    if ($script:AppWasStopped) {
        try { & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $BootStop | Out-Null } catch { }
    }
    [void](Restore-PreviousBuild "por fallo del deploy")
    Write-Log "Intentando levantar la app para no dejar el sitio caido..." "WARN"
    try {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $BootStart
        if ($LASTEXITCODE -eq 0) { Write-Log "App levantada con el build anterior" "WARN" }
        else { Write-Log "No se pudo levantar; el watchdog reintentara cada 5 min" "ERROR" }
    } catch {
        Write-Log "No se pudo levantar: $($_.Exception.Message)" "ERROR"
    }
    Write-Log "=== DEPLOY FAILED ===" "ERROR"
    exit 1
}

try {
    Write-Log "=== DEPLOY STARTED ==="
    Write-Log "Branch: $Branch"

    # 1. Go to app directory
    Set-Location $AppPath
    Write-Log "Working in: $AppPath"

    # Respaldo de un deploy anterior que no se pudo limpiar. Si el build
    # activo esta roto, se recupera el respaldo; si esta sano, se descarta.
    if (Test-Path $BuildPrevious) {
        if (Test-Path (Join-Path $BuildDir "BUILD_ID")) {
            Remove-Item -Path $BuildPrevious -Recurse -Force -ErrorAction SilentlyContinue
        } else {
            [void](Restore-PreviousBuild "al inicio del deploy")
        }
    }

    # 2. Pull latest code
    Write-Log "Pulling latest code from git..."
    $gitStatus = git status --porcelain 2>&1
    if ($gitStatus) {
        Write-Log "Warning: Working directory has uncommitted changes" "WARN"
        git stash | Out-Null
        Write-Log "Stashed local changes"
    }
    
    git fetch origin $Branch
    git reset --hard origin/$Branch
    Write-Log "Code updated to latest $Branch"

    # 3. Stop the app BEFORE touching node_modules (npm ci needs exclusive access)
    Write-Log "Stopping application..."
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $BootStop
    $stopCode = $LASTEXITCODE
    if ($stopCode -ne 0) {
        Fail "No se pudo detener la app (exit code $stopCode)"
    }
    $script:AppWasStopped = $true
    Start-Sleep -Seconds 2
    Write-Log "Application stopped"

    # 4. Install dependencies (solo si cambio package-lock.json)
    $lockHashFile = 'C:\arconet\logs\package-lock.sha256'
    $lockHash = if (Test-Path 'package-lock.json') { (Get-FileHash 'package-lock.json' -Algorithm SHA256).Hash } else { '' }
    $needInstall = (-not (Test-Path 'node_modules')) -or
                   (-not (Test-Path $lockHashFile)) -or
                   ((Get-Content $lockHashFile -Raw).Trim() -ne $lockHash)

    if (-not $SkipInstall) {
        if ($needInstall) {
            Write-Log "Installing dependencies..."
            $code = Invoke-Npm @('ci', '--no-audit', '--no-fund')
            if ($code -ne 0) { Fail "npm ci failed with exit code $code (ver C:\arconet\logs\deploy-npm.log)" }
            Set-Content -Path $lockHashFile -Value $lockHash -Encoding ascii
            Write-Log "Dependencies installed"
        } else {
            Write-Log "Dependencies unchanged (mismo package-lock), no se reinstala"
        }
    }

    # 5. Prisma generate ANTES del build: npm ci borra node_modules/.prisma y
    #    el build falla si el cliente generado no existe.
    if (Test-Path "prisma/schema.prisma") {
        Write-Log "Running Prisma generate..."
        $code = Invoke-Npm @('run', 'db:generate')
        if ($code -ne 0) { Fail "prisma generate failed with exit code $code" }
        Write-Log "Prisma client generated"

        Write-Log "Applying database migrations..."
        $code = Invoke-Npm @('run', 'db:migrate')
        if ($code -ne 0) {
            Write-Log "prisma migrate deploy failed with exit code $code (se continua)" "WARN"
        } else {
            Write-Log "Database migrations applied"
        }
    }

    # 6. Build Next.js app
    if (-not $SkipBuild) {
        # Mover el build activo en vez de copiarlo: es instantaneo y permite
        # restaurarlo tal cual si el build nuevo falla.
        if (Test-Path $BuildDir) {
            if (Test-Path (Join-Path $BuildDir "BUILD_ID")) {
                if (Test-Path $BuildPrevious) {
                    Remove-Item -Path $BuildPrevious -Recurse -Force -ErrorAction SilentlyContinue
                }
                Move-Item -Path $BuildDir -Destination $BuildPrevious -Force -ErrorAction Stop
                Write-Log "Build anterior preservado en $BuildPrevious"
            } else {
                Write-Log "El build actual no tiene BUILD_ID; se descarta" "WARN"
                Remove-Item -Path $BuildDir -Recurse -Force -ErrorAction SilentlyContinue
            }
        }

        Write-Log "Building Next.js app..."
        $env:NODE_ENV = "production"
        $code = Invoke-Npm @('run', 'build')
        if ($code -ne 0) { Fail "npm run build failed with exit code $code" }
        Write-Log "Build completed"
    }

    # 7. Start app (the boot script verifies HTTP 200 and exits != 0 on failure)
    Write-Log "Starting application..."
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $BootStart
    $startCode = $LASTEXITCODE
    if ($startCode -ne 0) {
        Write-Log "The application failed to start (exit code $startCode)" "ERROR"
        try { & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $BootStop | Out-Null } catch { }
        $restored = Restore-PreviousBuild "por fallo de arranque"
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $BootStart
        $startCode = $LASTEXITCODE
        if ($startCode -ne 0) { Fail "The application failed to start with the previous build too" }
        if ($restored) {
            Write-Log "El build nuevo no arranco; se dejo el build anterior. Deploy marcado como fallido." "ERROR"
            exit 1
        }
    }
    Write-Log "Application started and responding"

    # 8. Health check
    Start-Sleep -Seconds 5
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Log "Health check PASSED - App is responding"
        } else {
            Fail "Health check failed with status $($response.StatusCode)"
        }
    } catch {
        Fail "Health check FAILED - $($_.Exception.Message)"
    }

    if (Test-Path $BuildPrevious) {
        Remove-Item -Path $BuildPrevious -Recurse -Force -ErrorAction SilentlyContinue
    }
    Write-Log "=== DEPLOY COMPLETED SUCCESSFULLY ==="
    exit 0

} catch {
    Fail "Excepcion: $($_.Exception.Message)"
}
