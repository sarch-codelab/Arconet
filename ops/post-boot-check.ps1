<#
    Verificacion posterior al reinicio de Arconet.
    Se puede ejecutar SIN elevacion.
    Uso:  powershell -NoProfile -ExecutionPolicy Bypass -File C:\arconet\boot\post-boot-check.ps1
#>

$ErrorActionPreference = 'Continue'
$ok = 0; $fail = 0
function Check {
    param([string]$Name, [scriptblock]$Test, [string]$Detail = '')
    try {
        $r = & $Test
        if ($r) { $script:ok++;  Write-Host ("[ OK ] {0} {1}" -f $Name, $Detail) -ForegroundColor Green }
        else    { $script:fail++; Write-Host ("[FALLA] {0}" -f $Name)   -ForegroundColor Red }
    } catch {
        $script:fail++
        Write-Host ("[FALLA] {0} -> {1}" -f $Name, $_.Exception.Message) -ForegroundColor Red
    }
}

$boot = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
Write-Host "=== Verificacion Arconet ==="
Write-Host ("Arranque del sistema: {0}  (hace {1:N1} min)" -f $boot, ((Get-Date) - $boot).TotalMinutes)
Write-Host ""

# 1. La app escucha en el puerto 3000
$conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
Check 'Puerto 3000 escuchando' { [bool]$conn }
if ($conn) {
    $p = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
    Write-Host ("       PID {0} ({1}) iniciado {2}" -f $conn.OwningProcess, $p.ProcessName, $p.StartTime)
}

# 2. Responde HTTP 200
Check 'HTTP 200 en localhost:3000' {
    (Invoke-WebRequest 'http://localhost:3000' -UseBasicParsing -TimeoutSec 15).StatusCode -eq 200
}

# 3. Arranque automatico: la entrada del log de este reinicio debe ser de SYSTEM
$bootLog = 'C:\arconet\logs\arconet-boot.log'
if (Test-Path $bootLog) {
    $last = Get-Content $bootLog | Where-Object { $_ -match '=== Arranque Arconet' } | Select-Object -Last 1
    Write-Host "       Ultimo arranque registrado: $last"
    Check 'Arranque automatico como SYSTEM' { $last -match 'DESKTOP-CS21EKM\$|SYSTEM' }
    Check 'Arranque posterior al reinicio' {
        if ($last -match '^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]') {
            [datetime]::ParseExact($Matches[1], 'yyyy-MM-dd HH:mm:ss', $null) -ge $boot.AddSeconds(-5)
        } else { $false }
    }
} else { Check 'Log de arranque existe' { $false } }

# 4. Watchdog activo
$wdLog = 'C:\arconet\logs\arconet-watchdog.log'
if (Test-Path $wdLog) {
    $lastWd = Get-Content $wdLog | Select-Object -Last 1
    Write-Host "       Watchdog: $lastWd"
    Check 'Watchdog sin errores' { $lastWd -match '\[INFO\]' }
} else { Check 'Log del watchdog existe' { $false } }

# 5. Tareas programadas presentes
$tasks = @('ArconetApp','ArconetWatchdog','ArconetStop','ArconetDeploy','ArconetDeployPoll','Backup Arconet')
foreach ($t in $tasks) {
    $txt = schtasks /query /tn $t /fo LIST 2>&1
    Check "Tarea '$t'" { $LASTEXITCODE -eq 0 }
}

Write-Host ""
Write-Host ("Resumen: {0} correctas, {1} fallas" -f $ok, $fail)
if ($fail -eq 0) { Write-Host 'TODO OK' -ForegroundColor Green; exit 0 }
else { Write-Host 'Hay fallas: revisa C:\arconet\logs' -ForegroundColor Yellow; exit 1 }
