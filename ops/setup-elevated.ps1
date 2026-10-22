<#
    Configuracion elevada de Arconet (ejecutar como Administrador).
    Registra/actualiza las tareas programadas de arranque, watchdog y backup.
    Escribe el resultado en C:\arconet\logs\elev-setup.log
#>

$ErrorActionPreference = 'Continue'
$LogFile = 'C:\arconet\logs\elev-setup.log'
New-Item -ItemType Directory -Force -Path 'C:\arconet\logs' | Out-Null
function W { param($m,$l='INFO') Add-Content -Path $LogFile -Value ('[{0}] [{1}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'),$l,$m) -Encoding UTF8 }

W "=== Configuracion elevada de Arconet (admin=$([Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))) ==="

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

# ---------- 4. Backup Arconet: se habia perdido ----------
try {
    schtasks /query /tn "Backup Arconet" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { schtasks /delete /tn "Backup Arconet" /f 2>&1 | Out-Null }
    $r = schtasks /create /tn "Backup Arconet" `
        /tr 'PowerShell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\arconet\backup-arconet.ps1"' `
        /sc DAILY /st 02:00 /ru SYSTEM /rl HIGHEST /f 2>&1
    W "OK  tarea Backup Arconet: $($r -join ' ')"
} catch { W "ERR Backup Arconet: $($_.Exception.Message)" 'ERROR' }

# ---------- 4b. ArconetDeploy: deploy bajo demanda (SYSTEM) ----------
# El deploy por SSH (GitHub Actions) NO llega elevado: el token del usuario
# esta filtrado por UAC, asi que no puede matar el proceso SYSTEM de la app.
# Por eso el deploy se ejecuta como SYSTEM a traves de esta tarea.
try {
    $depAction = New-ScheduledTaskAction -Execute 'powershell.exe' `
        -Argument '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\arconet\app\deploy.ps1"' `
        -WorkingDirectory 'C:\arconet\app'
    $depSettings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
        -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
        -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName 'ArconetDeploy' -Action $depAction -Principal $principal -Settings $depSettings -Force | Out-Null
    W "OK  tarea ArconetDeploy: deploy bajo demanda como SYSTEM (sin trigger)"
} catch { W "ERR ArconetDeploy: $($_.Exception.Message)" 'ERROR' }

# ---------- 4c. Permisos de las tareas ----------
# Por defecto las tareas creadas como SYSTEM no son legibles/ejecutables por el
# usuario cuando su token esta filtrado (UAC): "Acceso denegado" en schtasks.
# Se concede control total al usuario concreto (su SID, presente en el token
# filtrado) y solo lectura/ejecucion al grupo Usuarios.
try {
    $userSid = ([Security.Principal.WindowsIdentity]::GetCurrent()).User.Value
    $sddl = "O:BAG:SYD:(A;;FA;;;BA)(A;;FA;;;SY)(A;;FA;;;$userSid)(A;;GRGX;;;BU)"
    $svc = New-Object -ComObject Schedule.Service
    $svc.Connect($null, $null, $null, $null)
    $root = $svc.GetFolder('\')
    foreach ($n in @('ArconetApp','ArconetWatchdog','ArconetStop','ArconetDeploy','Backup Arconet')) {
        try {
            $t = $root.GetTask($n)
            $t.SetSecurityDescriptor($sddl, 0)
            W "OK  ACL de '$n' ajustada (usuario $userSid)"
        } catch { W "ERR ACL de '$n': $($_.Exception.Message)" 'ERROR' }
    }
} catch { W "ERR ACL de tareas: $($_.Exception.Message)" 'ERROR' }

# ---------- 4d. git con SYSTEM ----------
# La tarea de deploy corre como SYSTEM y el repo pertenece al usuario:
# git lo rechazaria por "dubious ownership".
try {
    & git config --system --add safe.directory 'C:/arconet/app' 2>&1 | Out-Null
    & git config --system --add safe.directory 'C:\arconet\app' 2>&1 | Out-Null
    $sd = (& git config --system --get-all safe.directory) -join ', '
    W "OK  git safe.directory (system) = $sd"
} catch { W "ERR git safe.directory: $($_.Exception.Message)" 'ERROR' }

# ---------- 5. Limpiar el Notepad huerfano del arranque roto ----------
try {
    Get-CimInstance Win32_Process -Filter "Name='notepad.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CreationDate -and $_.CommandLine -match 'nodejs\\npm' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; W "OK  cerrado notepad huerfano PID $($_.ProcessId)" }
} catch { }

# ---------- 6. Verificacion ----------
foreach ($t in @('ArconetApp','ArconetWatchdog','ArconetStop','ArconetDeploy','Backup Arconet')) {
    $task = Get-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue
    if ($task) {
        $i = Get-ScheduledTaskInfo -TaskName $t -ErrorAction SilentlyContinue
        W "VER tarea '$t' existe | user=$($task.Principal.UserId) | estado=$($task.State) | ultimo=$($i.LastRunTime) res=$($i.LastTaskResult) prox=$($i.NextRunTime)"
    } else {
        W "VER tarea '$t' NO EXISTE" 'ERROR'
    }
}

W "=== FIN ==="
