<#
    Configuracion elevada de Arconet (ejecutar como Administrador).

    Instala los scripts de operacion en C:\arconet\boot y registra/actualiza
    las tareas programadas de arranque, watchdog, parada y backup.

    Uso (PowerShell como Administrador):
        powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\setup-elevated.ps1

    Resultado en: C:\arconet\logs\elev-setup.log
#>

$ErrorActionPreference = 'Continue'
$LogFile = 'C:\arconet\logs\elev-setup.log'
New-Item -ItemType Directory -Force -Path 'C:\arconet\logs' | Out-Null
function W { param($m,$l='INFO') Add-Content -Path $LogFile -Value ('[{0}] [{1}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'),$l,$m) -Encoding UTF8 }

$RepoOps = if ($PSScriptRoot) { $PSScriptRoot } else { 'C:\arconet\app\ops' }
$BootDir = 'C:\arconet\boot'

W "=== Configuracion elevada de Arconet (admin=$([Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))) ==="

# ---------- 0) Sincronizar los scripts de operacion a C:\arconet\boot ----------
try {
    New-Item -ItemType Directory -Force -Path $BootDir | Out-Null
    foreach ($f in @('start-arconet.ps1','stop-arconet.ps1','watchdog.ps1')) {
        $src = Join-Path $RepoOps $f
        if (Test-Path $src) {
            Copy-Item $src (Join-Path $BootDir $f) -Force
            W "OK  sincronizado $f -> $BootDir"
        } else {
            W "WARN no se encontro $src" 'WARN'
        }
    }
} catch { W "ERR sincronizando scripts: $($_.Exception.Message)" 'ERROR' }

# ---------- 1. ArconetApp: arranque automatico al iniciar Windows ----------
try {
    $action = New-ScheduledTaskAction -Execute 'powershell.exe' `
        -Argument '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\arconet\boot\start-arconet.ps1"' `
        -WorkingDirectory 'C:\arconet\app'
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $trigger.Delay = 'PT1M'
    $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
        -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
        -ExecutionTimeLimit ([TimeSpan]::Zero) `
        -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName 'ArconetApp' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
    W "OK  tarea ArconetApp: SYSTEM + AtStartup (+1 min), reintenta 3 veces"
} catch { W "ERR ArconetApp: $($_.Exception.Message)" 'ERROR' }

# ---------- 2. ArconetWatchdog: supervisa cada 5 minutos ----------
try {
    $wAction = New-ScheduledTaskAction -Execute 'powershell.exe' `
        -Argument '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\arconet\boot\watchdog.ps1"' `
        -WorkingDirectory 'C:\arconet\app'
    $wTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes 5)
    $wPrincipal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
    $wSettings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
        -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
        -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName 'ArconetWatchdog' -Action $wAction -Trigger $wTrigger -Principal $wPrincipal -Settings $wSettings -Force | Out-Null
    W "OK  tarea ArconetWatchdog: cada 5 minutos"
} catch { W "ERR ArconetWatchdog: $($_.Exception.Message)" 'ERROR' }

# ---------- 3. ArconetStop: parada bajo demanda (SYSTEM) ----------
try {
    $stopAction = New-ScheduledTaskAction -Execute 'powershell.exe' `
        -Argument '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\arconet\boot\stop-arconet.ps1"' `
        -WorkingDirectory 'C:\arconet\app'
    # Sin trigger: la tarea solo se ejecuta a demanda (schtasks /run)
    $stopSettings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
        -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
        -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName 'ArconetStop' -Action $stopAction -Principal $principal -Settings $stopSettings -Force | Out-Null
    W "OK  tarea ArconetStop: parada bajo demanda como SYSTEM (sin trigger)"
} catch { W "ERR ArconetStop: $($_.Exception.Message)" 'ERROR' }

# ---------- 4. Backup Arconet ----------
try {
    schtasks /query /tn "Backup Arconet" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { schtasks /delete /tn "Backup Arconet" /f 2>&1 | Out-Null }
    $r = schtasks /create /tn "Backup Arconet" `
        /tr 'PowerShell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\arconet\backup-arconet.ps1"' `
        /sc DAILY /st 02:00 /ru SYSTEM /rl HIGHEST /f 2>&1
    W "OK  tarea Backup Arconet: $($r -join ' ')"
} catch { W "ERR Backup Arconet: $($_.Exception.Message)" 'ERROR' }

# ---------- 5. Limpiar el Notepad huerfano del arranque roto ----------
try {
    Get-CimInstance Win32_Process -Filter "Name='notepad.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CreationDate -and $_.CommandLine -match 'nodejs\\npm' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; W "OK  cerrado notepad huerfano PID $($_.ProcessId)" }
} catch { }

# ---------- 6. Verificacion ----------
foreach ($t in @('ArconetApp','ArconetWatchdog','ArconetStop','Backup Arconet')) {
    $task = Get-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue
    if ($task) {
        $i = Get-ScheduledTaskInfo -TaskName $t -ErrorAction SilentlyContinue
        W "VER tarea '$t' existe | user=$($task.Principal.UserId) | estado=$($task.State) | ultimo=$($i.LastRunTime) res=$($i.LastTaskResult) prox=$($i.NextRunTime)"
    } else {
        W "VER tarea '$t' NO EXISTE" 'ERROR'
    }
}

W "=== FIN ==="
