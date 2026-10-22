<#
.SYNOPSIS
    Stop Arconet Next.js app
.DESCRIPTION
    Wrapper de la deteccion/parada real, que vive en
    C:\arconet\boot\stop-arconet.ps1 (fuera del repositorio git para que
    `git reset --hard` / `git clean` del deploy no lo borren).

    NOTA: antes usaba `Get-Process node | Where-Object { $_.CommandLine -like ... }`.
    Get-Process NO tiene propiedad CommandLine (solo Win32_Process la tiene),
    asi que el filtro nunca coincidia y las instancias quedaban vivas.
#>

$ErrorActionPreference = "Continue"

# La parada real vive en C:\arconet\boot (instalado por ops\setup-elevated.ps1).
# Si no esta instalado, se usa la copia versionada en el repo (ops\).
$Candidates = @(
    "C:\arconet\boot\stop-arconet.ps1",
    (Join-Path $PSScriptRoot "ops\stop-arconet.ps1")
)
$StopScript = $Candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $StopScript) {
    Write-Host "ERROR: no se encontro el script de parada ($($Candidates -join ' | '))" -ForegroundColor Red
    exit 1
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $StopScript
exit $LASTEXITCODE
