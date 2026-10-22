<#
.SYNOPSIS
    Check Arconet app status
.DESCRIPTION
    Estado del proceso, del puerto 3000, de las tareas programadas y del
    ultimo arranque. Muestra informacion util para diagnosticar apagones.

    Funciona sin privilegios de administrador: la deteccion del proceso se
    hace por el propietario del socket del puerto 3000 (un usuario normal no
    puede leer el CommandLine de un proceso propiedad de SYSTEM).
#>

$AppPath = "C:\arconet\app"
$PidFile = "C:\arconet\app.pid"
$Port    = 3000

$isAdmin = ([Security.Principal.WindowsPrincipal]::new(
                [Security.Principal.WindowsIdentity]::GetCurrent())
            ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

Write-Host "=== Arconet App Status ==="
Write-Host "Ejecutado como: $env:USERNAME (elevado: $isAdmin)"
Write-Host ""

# --- Proceso real: propietario del socket del puerto 3000 -------------------
$conn = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
if ($conn.Count -gt 0) {
    $appPid = $conn[0].OwningProcess
    $proc = Get-Process -Id $appPid -ErrorAction SilentlyContinue
    $mem = if ($proc) { [math]::Round($proc.WorkingSet64 / 1MB) } else { 0 }
    Write-Host "Process: RUNNING (PID: $appPid, proceso: $(if($proc){$proc.ProcessName}else{'?'}), memoria: $mem MB)"
} else {
    Write-Host "Process: NOT RUNNING (nada escuchando en el puerto $Port)"
}

if (Test-Path $PidFile) {
    $pidFilePid = (Get-Content $PidFile -Raw -ErrorAction SilentlyContinue).Trim()
    $alive = $pidFilePid -and (Get-Process -Id $pidFilePid -ErrorAction SilentlyContinue)
    Write-Host "PID file: $pidFilePid ($(if($alive){'vivo'}else{'obsoleto'}))"
} else {
    Write-Host "PID file: (no existe)"
}

# --- Puerto / HTTP ---
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port" -UseBasicParsing -TimeoutSec 8
    Write-Host "HTTP: OK (Status: $($response.StatusCode))"
} catch {
    Write-Host "HTTP: FAILED - $($_.Exception.Message)"
}

# --- Tareas programadas (requieren elevar si son de SYSTEM) ---
foreach ($t in @("ArconetApp", "ArconetWatchdog", "ArconetStop", "Backup Arconet")) {
    try {
        $task = Get-ScheduledTask -TaskName $t -ErrorAction Stop
        $info = Get-ScheduledTaskInfo -TaskName $t -ErrorAction Stop
        Write-Host "Task '$t': $($task.State) | user=$($task.Principal.UserId) | ultimo=$($info.LastRunTime) resultado=$($info.LastTaskResult) proximo=$($info.NextRunTime)"
    } catch {
        Write-Host "Task '$t': no visible sin privilegios de administrador (ejecuta status.ps1 como Administrador)"
    }
}

# --- SSH ---
$sshd = Get-Service sshd -ErrorAction SilentlyContinue
if ($sshd) {
    Write-Host "SSH Server: $($sshd.Status) ($($sshd.StartType))"
} else {
    Write-Host "SSH Server: NOT INSTALLED"
}

# --- Git ---
Set-Location $AppPath
$gitStatus = git status --short 2>&1
if ($gitStatus) {
    Write-Host "Git: UNCOMMITTED CHANGES"
    $gitStatus | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "Git: CLEAN"
}
Write-Host "Branch: $(git branch --show-current 2>&1)"
Write-Host "Last Commit: $(git log --oneline -1 2>&1)"

# --- Logs ---
Write-Host ""
Write-Host "=== Log Files ==="
Write-Host "Boot log   : C:\arconet\logs\arconet-boot.log"
Write-Host "Watchdog   : C:\arconet\logs\arconet-watchdog.log"
Write-Host "App stdout : C:\arconet\logs\app.out.log"
Write-Host "App stderr : C:\arconet\logs\app.err.log"
Write-Host "Deploy log : C:\arconet\deploy.log"

Write-Host ""
Write-Host "=== Ultimas lineas del boot log ==="
Get-Content "C:\arconet\logs\arconet-boot.log" -Tail 10 -ErrorAction SilentlyContinue |
    ForEach-Object { Write-Host "  $_" }
