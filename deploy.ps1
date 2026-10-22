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

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Write-Host $logEntry
    Add-Content -Path $LogFile -Value $logEntry
}

try {
    Write-Log "=== DEPLOY STARTED ==="
    Write-Log "Branch: $Branch"

    # 1. Go to app directory
    Set-Location $AppPath
    Write-Log "Working in: $AppPath"

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
    & "$BootStop"
    Start-Sleep -Seconds 2
    Write-Log "Application stopped"

    # 4. Install dependencies
    if (-not $SkipInstall) {
        Write-Log "Installing dependencies..."
        & $NpmCmd ci 2>&1 | Tee-Object -Variable installOutput
        if ($LASTEXITCODE -ne 0) {
            Write-Log "npm ci failed with exit code $LASTEXITCODE" "ERROR"
            exit 1
        }
        Write-Log "Dependencies installed"
    }

    # 5. Build Next.js app
    if (-not $SkipBuild) {
        Write-Log "Building Next.js app..."
        $env:NODE_ENV = "production"
        & $NpmCmd run build 2>&1 | Tee-Object -Variable buildOutput
        if ($LASTEXITCODE -ne 0) {
            Write-Log "npm run build failed with exit code $LASTEXITCODE" "ERROR"
            exit 1
        }
        Write-Log "Build completed"
    }

    # 6. Run Prisma generate/migrate if needed (optional - skip if DB not available)
    if (Test-Path "prisma/schema.prisma") {
        Write-Log "Running Prisma generate..."
        try {
            & $NpmCmd run db:generate 2>&1 | Out-Null
            Write-Log "Running Prisma migrate deploy..."
            & $NpmCmd run db:migrate 2>&1 | Out-Null
            Write-Log "Database migrations applied"
        } catch {
            Write-Log "Prisma steps skipped (database may not be available)" "WARN"
        }
    }

    # 7. Start app (the boot script verifies HTTP 200 and exits != 0 on failure)
    Write-Log "Starting application..."
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $BootStart
    $startCode = $LASTEXITCODE
    if ($startCode -ne 0) {
        Write-Log "The application failed to start (exit code $startCode)" "ERROR"
        exit 1
    }
    Write-Log "Application started and responding"

    # 8. Health check
    Start-Sleep -Seconds 5
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Log "Health check PASSED - App is responding"
        } else {
            Write-Log "Health check WARNING - Status: $($response.StatusCode)" "WARN"
        }
    } catch {
        Write-Log "Health check FAILED - $($_.Exception.Message)" "ERROR"
        exit 1
    }

    Write-Log "=== DEPLOY COMPLETED SUCCESSFULLY ==="
    exit 0

} catch {
    Write-Log "=== DEPLOY FAILED: $($_.Exception.Message) ===" "ERROR"
    exit 1
}
