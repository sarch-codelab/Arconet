<#
.SYNOPSIS
    Watchdog de Arconet: verifica la app y la reinicia si esta caida.

.DESCRIPTION
    Se ejecuta cada 5 minutos desde la tarea programada "ArconetWatchdog".
    Si http://127.0.0.1:3000 no responde 200, relanza el arranque.
    Vive fuera del repo git para sobrevivir a `git clean` del deploy.
#>

[CmdletBinding()]
param(
    [int] $Port = 3000
)

$ErrorActionPreference = 'Continue'

$LogDir  = 'C:\arconet\logs'
$LogFile = Join-Path $LogDir 'arconet-watchdog.log'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-Log {
    param([string] $Message, [string] $Level = 'INFO')
    Add-Content -Path $LogFile `
        -Value ('[{0}] [{1}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message) `
        -Encoding UTF8
}

$healthy = $false
try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -UseBasicParsing -TimeoutSec 10
    $healthy = ($r.StatusCode -eq 200)
} catch {
    $healthy = $false
}

if ($healthy) {
    Write-Log "OK - la app responde correctamente"
    exit 0
}

Write-Log "La app NO responde en el puerto $Port - relanzando" 'WARN'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'C:\arconet\boot\start-arconet.ps1' -Port $Port | Out-Null
$code = $LASTEXITCODE
Write-Log "Resultado del reinicio: exit code $code" $(if ($code -eq 0) { 'INFO' } else { 'ERROR' })
exit $code
