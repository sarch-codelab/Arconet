<#
    Lanza el deploy en el servidor desde una sesion SSH NO elevada (GitHub Actions).
    No puede ejecutar deploy.ps1 directamente: el token del usuario esta filtrado
    por UAC y no puede detener la app, que corre como SYSTEM.

    Estrategia: dispara la tarea programada ArconetDeploy (SYSTEM), sigue
    C:\arconet\deploy.log y devuelve el codigo de salida del deploy.

    Codigos: 0 = exito, 1 = deploy fallo, 3 = no se pudo lanzar la tarea,
             4 = timeout.
#>

$ErrorActionPreference = 'Continue'
$Log  = 'C:\arconet\deploy.log'
$Task = 'ArconetDeploy'
$TimeoutMin = 25

function Out-Line { param($m) Write-Host $m }

$offset = 0
if (Test-Path $Log) { $offset = @(Get-Content -Path $Log).Count }

Out-Line "Lanzando tarea '$Task'..."
schtasks /run /tn $Task 2>&1 | ForEach-Object { Out-Line "  $_" }
if ($LASTEXITCODE -ne 0) {
    Out-Line "ERROR: no se pudo lanzar '$Task' (exit $LASTEXITCODE)"
    exit 3
}

$deadline = (Get-Date).AddMinutes($TimeoutMin)
$printed  = 0
$result   = $null

while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 3
    if (-not (Test-Path $Log)) { continue }
    $all = @(Get-Content -Path $Log)
    if ($all.Count -le $offset) { continue }

    $new = $all[$offset..($all.Count - 1)]
    foreach ($l in $new) { Out-Line $l }
    $printed += $new.Count
    $offset = $all.Count

    if ($new -match 'DEPLOY COMPLETED SUCCESSFULLY') { $result = 0; break }
    if ($new -match 'DEPLOY FAILED')                { $result = 1; break }
}

if ($null -eq $result) {
    Out-Line "ERROR: timeout de $TimeoutMin minutos esperando el deploy."
    $info = $null
    try { $info = Get-ScheduledTaskInfo -TaskName $Task -ErrorAction Stop } catch {}
    if ($info) { Out-Line "  Tarea: estado=$($info.State) ultimo=$($info.LastRunTime) res=$($info.LastTaskResult)" }
    exit 4
}

if ($printed -eq 0) { Out-Line 'AVISO: el deploy no escribio nada nuevo en el log.' }
Out-Line "Deploy terminado con codigo $result."
exit $result
