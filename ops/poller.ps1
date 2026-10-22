<#
    Poller de despliegue de Arconet.
    Corre como SYSTEM cada 5 minutos (tarea ArconetDeployPoll).

    Por que existe: GitHub Actions no puede alcanzar este servidor (esta en
    ZeroTier, sin IP publica), asi que en vez de que GitHub haga push del
    deploy, el servidor revisa solo si origin/main avanzo.

    Salvaguardas:
      - No despliega si el repo tiene cambios sin commitear.
      - No despliega si HEAD tiene commits que no estan en origin/main
        (deploy.ps1 hace git reset --hard: se perderian).
      - Si un commit falla, no lo reintenta hasta que aparezca uno nuevo
        (evita un bucle de deploys rotos cada 5 minutos).
#>

$ErrorActionPreference = 'Continue'
$AppPath   = 'C:\arconet\app'
$Log       = 'C:\arconet\logs\arconet-poller.log'
$StateFile = 'C:\arconet\logs\arconet-poller.state'
$TaskName  = 'ArconetDeploy'
$Remote    = 'origin'
$Branch    = 'main'
$MaxWaitMin = 30

function W {
    param([string]$m, [string]$l = 'INFO')
    Add-Content -Path $Log -Value ('[{0}] [{1}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $l, $m) -Encoding UTF8
}
function Short([string]$sha) { if ($sha -and $sha.Length -ge 7) { $sha.Substring(0, 7) } else { $sha } }

# Rotar el log si crece demasiado
if ((Test-Path $Log) -and (Get-Item $Log).Length -gt 524288) {
    $keep = Get-Content $Log -Tail 200
    Set-Content -Path $Log -Value $keep -Encoding UTF8
}

$git = (Get-Command git.exe -ErrorAction SilentlyContinue).Source
if (-not $git) { $git = 'C:\Program Files\Git\cmd\git.exe' }
if (-not (Test-Path $git)) { W "No se encontro git.exe" 'ERROR'; exit 2 }
if (-not (Test-Path $AppPath)) { W "No existe $AppPath" 'ERROR'; exit 2 }

# 1. Traer refs del remoto (repo publico: no necesita credenciales)
$out = & $git -C $AppPath fetch $Remote $Branch --quiet 2>&1
if ($LASTEXITCODE -ne 0) { W "git fetch fallo: $($out -join ' ')" 'ERROR'; exit 3 }

$head   = (& $git -C $AppPath rev-parse HEAD 2>&1 | Select-Object -First 1)
$target = (& $git -C $AppPath rev-parse "$Remote/$Branch" 2>&1 | Select-Object -First 1)
if (-not $head -or -not $target) { W "No pude resolver HEAD/$Remote-$Branch" 'ERROR'; exit 3 }
$head = $head.Trim(); $target = $target.Trim()

# 2. Nada nuevo
if ($head -eq $target) { W "Sin cambios (HEAD=$((Short $head)))"; exit 0 }

# 3. Ese commit ya fallo
if ((Test-Path $StateFile) -and ((Get-Content $StateFile -Raw).Trim() -eq $target)) {
    W "El commit $(Short $target) ya fallo antes; se reintenta cuando haya uno nuevo" 'WARN'
    exit 0
}

# 4. No pisar trabajo local
$dirty = @(& $git -C $AppPath status --porcelain 2>&1)
if ($dirty.Count -gt 0) {
    W "Hay cambios sin commitear en el servidor; no despliego: $($dirty -join ' | ')" 'WARN'
    exit 0
}

& $git -C $AppPath merge-base --is-ancestor $head $target 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    W "HEAD $(Short $head) tiene commits que no estan en $Remote/$Branch; no despliego para no perderlos" 'WARN'
    exit 0
}

# 5. Desplegar mediante la tarea SYSTEM
# Si ya hay un deploy en curso (manual o anterior), no se lanza otro.
$RUNNING_CODE = 267009   # 0x41301 = SCHED_S_TASK_RUNNING
try {
    $cur = Get-ScheduledTaskInfo -TaskName $TaskName -ErrorAction Stop
    if ($cur.State -eq 'Running' -or $cur.LastTaskResult -eq $RUNNING_CODE) {
        W "Ya hay un deploy en curso ($TaskName); no lanzo otro" 'WARN'
        exit 0
    }
    $before = $cur.LastRunTime
} catch {
    W "No pude leer la tarea $TaskName : $($_.Exception.Message)" 'ERROR'; exit 4
}

W "Nuevo commit: $(Short $head) -> $(Short $target). Lanzando $TaskName"
schtasks /run /tn $TaskName 2>&1 | ForEach-Object { if ($_) { W "  ${_}" } }
if ($LASTEXITCODE -ne 0) { W "No se pudo lanzar $TaskName (exit $LASTEXITCODE)" 'ERROR'; exit 4 }

$deadline = (Get-Date).AddMinutes($MaxWaitMin)
$started  = $false
$info     = $null
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 10
    try { $info = Get-ScheduledTaskInfo -TaskName $TaskName -ErrorAction Stop } catch { continue }

    # La tarea tiene que haber arrancado (LastRunTime avanzó)...
    if ($info.LastRunTime -gt $before) { $started = $true }
    if (-not $started) { continue }

    # ...y haber terminado de verdad. Justo despues de lanzarla el estado puede
    # seguir siendo 'Ready' con LastTaskResult=267009 (en ejecucion): si se mira
    # solo una vez se confunde con un fallo.
    if ($info.State -eq 'Running') { continue }
    if ($info.LastTaskResult -eq $RUNNING_CODE) { continue }
    break
}

if (-not $started) {
    W "Timeout de $MaxWaitMin min: la tarea $TaskName no llego a arrancar" 'ERROR'; exit 5
}


if ($info.LastTaskResult -eq 0) {
    W "Deploy OK: $(Short $target) (duracion aprox. $([int](((Get-Date) - $info.LastRunTime).TotalMinutes)) min)"
    if (Test-Path $StateFile) { Remove-Item $StateFile -Force -ErrorAction SilentlyContinue }
    exit 0
}

W "Deploy FALLO para $(Short $target): LastTaskResult=$($info.LastTaskResult). Ver C:\arconet\deploy.log" 'ERROR'
Set-Content -Path $StateFile -Value $target -Encoding ascii
exit 1
