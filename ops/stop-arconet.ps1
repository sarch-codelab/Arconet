<#
.SYNOPSIS
    Detiene la app Arconet (Next.js) de forma fiable.

.DESCRIPTION
    Detecta los procesos de la app por tres vias complementarias:
      1) Propietario del socket que escucha en el puerto 3000  (funciona
         aunque el proceso sea de SYSTEM y nosotros no admins).
      2) PID guardado en C:\arconet\app.pid
      3) CommandLine de los procesos node (solo visible para los propios)

    Si no puede detenerlos por falta de privilegios, se re-eleva con UAC.
#>

[CmdletBinding()]
param(
    [int] $Port = 3000
)

$ErrorActionPreference = 'Continue'

$PidFile = 'C:\arconet\app.pid'
$LogFile = 'C:\arconet\logs\arconet-boot.log'

function Write-Log {
    param([string] $Message, [string] $Level = 'INFO')
    Add-Content -Path $LogFile `
        -Value ('[{0}] [{1}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message) `
        -Encoding UTF8
    Write-Host $Message
}

function Get-AppPids {
    $ids = New-Object System.Collections.Generic.HashSet[int]

    # (1) Propietario del puerto
    try {
        Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
            ForEach-Object { [void]$ids.Add([int]$_.OwningProcess) }
    } catch { }

    # (2) PID file
    if (Test-Path $PidFile) {
        $raw = (Get-Content $PidFile -Raw -ErrorAction SilentlyContinue).Trim()
        if ($raw -match '^\d+$') { [void]$ids.Add([int]$raw) }
    }

    # (3) CommandLine (visible solo para procesos del mismo nivel de privilegio)
    Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine -notmatch 'pm2' -and
                       ($_.CommandLine -match 'arconet' -or $_.CommandLine -match '[\\/]next[\\/]dist[\\/]bin') } |
        ForEach-Object { [void]$ids.Add([int]$_.ProcessId) }

    return @($ids | Where-Object { $_ -gt 0 })
}

$isAdmin = ([Security.Principal.WindowsPrincipal]::new(
                [Security.Principal.WindowsIdentity]::GetCurrent())
            ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

$pids = @(Get-AppPids)
if ($pids.Count -eq 0) {
    Write-Log "No hay procesos de Arconet corriendo."
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    exit 0
}

Write-Log "Deteniendo PIDs: $($pids -join ', ')  (admin=$isAdmin)"

$failed = @()
foreach ($id in $pids) {
    try {
        Stop-Process -Id $id -Force -ErrorAction Stop
        Write-Host "  PID $id detenido"
    } catch {
        $failed += $id
    }
}

if ($failed.Count -gt 0) {
    Write-Log "Sin permiso para detener: $($failed -join ', ') - se re-eleva (UAC)" 'WARN'
    try {
        $psExe = Join-Path $PSHOME 'powershell.exe'
        $argl = '-NoProfile -ExecutionPolicy Bypass -File "{0}" -Port {1}' -f $PSCommandPath, $Port
        Start-Process -FilePath $psExe -Verb RunAs -Wait -ArgumentList $argl | Out-Null
        Write-Log "Re-elevacion completada"
    } catch {
        Write-Log "No se pudo elevar: $($_.Exception.Message)" 'ERROR'
    }
}

Start-Sleep -Seconds 2
Remove-Item $PidFile -Force -ErrorAction SilentlyContinue

$still = @(Get-AppPids)
if ($still.Count -gt 0) {
    Write-Log "ATENCION: siguen vivos los PIDs $($still -join ', ')" 'ERROR'
    exit 1
}

Write-Log "App detenida."
exit 0
