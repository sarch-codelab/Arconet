<#
.SYNOPSIS
    Start Arconet Next.js app as a background process
.DESCRIPTION
    Wrapper del arranque real, que vive en C:\arconet\boot\start-arconet.ps1
    (fuera del repositorio git para que `git reset --hard` / `git clean` del
    deploy no lo borren).

    NOTA: antes este script hacia `Start-Process -FilePath "npm"`. En Windows
    "npm" resuelve a "C:\Program Files\nodejs\npm" (script bash SIN extension),
    por lo que Windows lo abria con el Bloc de notas en vez de ejecutarlo.
    El servidor "arrancaba bien" (codigo 0) pero la app nunca levantaba.
#>

$ErrorActionPreference = "Stop"

# El arranque real vive en C:\arconet\boot (instalado por ops\setup-elevated.ps1).
# Si no esta instalado, se usa la copia versionada en el repo (ops\).
$Candidates = @(
    "C:\arconet\boot\start-arconet.ps1",
    (Join-Path $PSScriptRoot "ops\start-arconet.ps1")
)
$BootScript = $Candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $BootScript) {
    Write-Host "ERROR: no se encontro el script de arranque ($($Candidates -join ' | '))" -ForegroundColor Red
    exit 1
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $BootScript
exit $LASTEXITCODE
