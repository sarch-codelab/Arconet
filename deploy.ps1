<#
    Compila en un workspace aislado; la app activa sigue sirviendo durante npm ci/build.
    Solo se detiene para migrar y promover los artefactos ya compilados.
    No es zero-downtime: un unico upstream requiere una breve ventana de cambio.
#>
param(
    [string]$Branch = 'main',
    [switch]$SkipBuild,
    [switch]$SkipInstall
)
$ErrorActionPreference = 'Stop'
$AppPath = 'C:\arconet\app'
$Candidate = 'C:\arconet\candidate'
$Previous = 'C:\arconet\previous'
$Archive = 'C:\arconet\candidate.zip'
$LogDir = 'C:\arconet\logs'
$LogFile = 'C:\arconet\deploy.log'
$NpmCmd = 'C:\Program Files\nodejs\npm.cmd'
$NodeExe = 'C:\Program Files\nodejs\node.exe'
$BootStart = 'C:\arconet\boot\start-arconet.ps1'
$BootStop = 'C:\arconet\boot\stop-arconet.ps1'
$Artifacts = @('.next', 'node_modules', 'generated')
$Saved = @()
$Promoted = @()
$Stopped = $false
$SourceChanged = $false
$Lock = $null
$OldHead = $null

function Write-Log([string]$Message, [string]$Level = 'INFO') {
    $line = '[{0}] [{1}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
    Write-Host $line
    Add-Content -Path $LogFile -Value $line
}
function Invoke-Npm([string[]]$NpmArgs) {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $NpmCmd @NpmArgs 2>&1 | Out-File (Join-Path $LogDir 'deploy-npm.log') -Append -Encoding utf8
        if ($LASTEXITCODE -ne 0) { throw "npm $($NpmArgs -join ' ') fallo (exit $LASTEXITCODE); ver deploy-npm.log" }
    } finally { $ErrorActionPreference = $prev }
}
function Invoke-Boot([string]$Script) {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Script
    if ($LASTEXITCODE -ne 0) { throw "Fallo $Script (exit $LASTEXITCODE)" }
}
function Assert-Healthy {
    # No basta que responda el HTML: comprobar BD/API, manifest y TODOS los
    # chunks JavaScript que piden las rutas criticas, incluida /admin. Un chunk
    # servido como 500 text/plain provoca ChunkLoadError en el navegador.
    $page = Invoke-WebRequest 'http://127.0.0.1:3000/' -UseBasicParsing -TimeoutSec 15
    $health = Invoke-WebRequest 'http://127.0.0.1:3000/api/health' -UseBasicParsing -TimeoutSec 15
    if ($page.StatusCode -ne 200 -or $health.StatusCode -ne 200 -or
        ($health.Content | ConvertFrom-Json).status -ne 'ok') { throw 'Health check HTML/BD fallo' }
    $manifest = Invoke-WebRequest 'http://127.0.0.1:3000/manifest.webmanifest' -UseBasicParsing -TimeoutSec 15
    if ($manifest.StatusCode -ne 200) { throw 'Manifest no disponible' }
    # El build promovido debe usar Webpack. El runtime de Turbopack puede
    # fallar en el navegador con «module factory is not available»; el build
    # oficial usa 'next build --webpack' (ver docs/module-factory-recovery.md).
    if ($page.Content -match '(?i)turbopack') { throw 'El build promovido usa Turbopack; se exige next build --webpack' }
    if (-not [regex]::IsMatch($page.Content, '/_next/static/chunks/webpack-[^"<> ]+\.js')) { throw 'El HTML promovido no carga un runtime Webpack' }

    $checked = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($route in @('/', '/admin', '/contacto', '/tienda')) {
        $html = if ($route -eq '/') { $page } else { Invoke-WebRequest ('http://127.0.0.1:3000' + $route) -UseBasicParsing -TimeoutSec 15 }
        if ($html.StatusCode -ne 200) { throw "Ruta $route respondio $($html.StatusCode)" }
        # ?dpl= obligaba a re-descargar los chunks en cada deploy; un proxy
        # llego a cachear un 500 text/plain para uno de ellos.
        if ($html.Content -match '\?dpl=') { throw "Ruta $route aun usa el sufijo ?dpl=; revisar NEXT_DEPLOYMENT_ID" }
        foreach ($match in [regex]::Matches($html.Content, '/_next/static/[^"<> ]+\.js(?:\?[^"<> ]*)?')) {
            $url = [System.Net.WebUtility]::HtmlDecode($match.Value)
            if (-not $checked.Add($url)) { continue }
            $asset = Invoke-WebRequest ("http://127.0.0.1:3000" + $url) -UseBasicParsing -TimeoutSec 15
            if ($asset.StatusCode -ne 200 -or $asset.Headers['Content-Type'] -notmatch 'javascript') {
                throw "Chunk $url respondio $($asset.StatusCode) con $($asset.Headers['Content-Type']); se exige JavaScript 200"
            }
        }
    }
    if ($checked.Count -eq 0) { throw 'No se verifico ningun chunk JavaScript' }

    # Un chunk puede estar en el disco y, aun asi, el servidor devolver un 500
    # text/plain (directorio de estaticos corrupto, archivo ilegible o respuesta
    # cacheada). En produccion paso exactamente eso con app/admin/page-*.js:
    # el HTML lo pedia, existia en .next, pero nunca llego como JavaScript.
    # Comprobar TODOS los .js del build, no solo los que aparecen en el HTML.
    $staticRoot = Join-Path $AppPath '.next\static'
    $chunksRoot = Join-Path $staticRoot 'chunks'
    $diskChunks = @(Get-ChildItem $chunksRoot -Recurse -File -Filter '*.js' -ErrorAction Stop)
    if ($diskChunks.Count -eq 0) { throw 'El runtime promovido no tiene chunks JavaScript en disco' }
    $prefixLength = $staticRoot.Length
    foreach ($file in $diskChunks) {
        $url = '/_next/static' + $file.FullName.Substring($prefixLength).Replace('\', '/')
        if ($file.Length -eq 0) { throw "Chunk vacio en disco: $url" }
        if ($checked.Contains($url)) { continue }
        $asset = Invoke-WebRequest ("http://127.0.0.1:3000" + $url) -UseBasicParsing -TimeoutSec 15
        if ($asset.StatusCode -ne 200 -or $asset.Headers['Content-Type'] -notmatch 'javascript') {
            throw "Chunk en disco $url respondio $($asset.StatusCode) con $($asset.Headers['Content-Type']); se exige JavaScript 200"
        }
        [void]$checked.Add($url)
    }
    Write-Log "Health check completo: $($checked.Count) chunks JavaScript 200 (HTML de /, /admin, /contacto y /tienda + todos los del disco)"
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
try {
    # Exclusivo y liberado por Windows si el proceso muere; un archivo viejo no bloquea.
    $Lock = [System.IO.File]::Open((Join-Path $LogDir 'deploy.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
} catch { Write-Log 'Otro despliegue esta activo; no se inicia otro.' 'WARN'; exit 2 }

$ExitCode = 1
try {
    if ($SkipBuild -or $SkipInstall) { throw 'SkipBuild/SkipInstall ya no son seguros: cada candidato necesita su propio build y dependencias.' }
    Set-Location $AppPath
    Write-Log '=== DEPLOY STARTED: preparacion aislada, app activa ==='
    $dirty = @(git status --porcelain)
    if ($LASTEXITCODE -ne 0 -or $dirty.Count -gt 0) { throw 'Repositorio sucio o ilegible; no se descartan cambios locales.' }
    $OldHead = (git rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo resolver HEAD' }
    git fetch origin $Branch
    if ($LASTEXITCODE -ne 0) { throw 'git fetch fallo' }
    $Target = (git rev-parse "origin/$Branch").Trim()
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo resolver el commit objetivo' }
    git merge-base --is-ancestor $OldHead $Target
    if ($LASTEXITCODE -ne 0) { throw 'HEAD contiene trabajo ajeno al objetivo; no se sobrescribe.' }

    if (Test-Path $Candidate) { Remove-Item $Candidate -Recurse -Force }
    git archive '--format=zip' "--output=$Archive" $Target
    if ($LASTEXITCODE -ne 0) { throw 'git archive fallo' }
    Expand-Archive -Path $Archive -DestinationPath $Candidate -Force
    Remove-Item $Archive -Force
    # Solo configuracion; no copiar fotos, backups ni el runtime activo.
    foreach ($file in @('.env', '.env.local', '.env.production', '.env.production.local')) {
        $source = Join-Path $AppPath $file
        if (Test-Path $source) { Copy-Item $source (Join-Path $Candidate $file) -Force }
    }
    Set-Location $Candidate
    $env:NODE_ENV = 'production'
    # Sin NEXT_DEPLOYMENT_ID: ver el comentario en next.config.mjs.
    Remove-Item Env:NEXT_DEPLOYMENT_ID -ErrorAction SilentlyContinue
    # build necesita tambien las devDependencies (Prisma/TypeScript).
    Invoke-Npm -NpmArgs @('ci', '--include=dev', '--no-audit', '--no-fund')
    Invoke-Npm -NpmArgs @('run', 'build')
    if (-not (Test-Path '.next\BUILD_ID')) { throw 'El candidato no contiene un build completo' }
    # Verificar en disco que cada chunk referenciado por el HTML existe y que
    # el chunk de /admin esta presente ANTES de tocar el runtime activo.
    & $NodeExe (Join-Path $Candidate 'ops\verify-static-assets.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Faltan chunks del build; no se promueve' }
    & $NodeExe (Join-Path $Candidate 'ops\retain-static-assets.mjs') (Join-Path $AppPath '.next\static') (Join-Path $Candidate '.next\static')
    if ($LASTEXITCODE -ne 0) { throw 'No se pudieron conservar los assets anteriores' }
    Write-Log 'Candidato compilado; comienza ventana corta de promocion'

    # Instalar el watchdog con guardia ANTES de detener; tambien sirve al primer rollout.
    foreach ($script in @('watchdog.ps1', 'start-arconet.ps1', 'poller.ps1')) {
        Copy-Item (Join-Path $Candidate ('ops\' + $script)) (Join-Path 'C:\arconet\boot' $script) -Force
    }
    Set-Location $AppPath
    # Marcar antes de invocar: incluso un stop parcial requiere recuperacion.
    $Stopped = $true
    Invoke-Boot $BootStop
    Set-Location $Candidate
    Invoke-Npm -NpmArgs @('run', 'db:migrate')
    Set-Location $AppPath
    $SourceChanged = $true
    git reset --hard $Target
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo activar el codigo del candidato' }

    if (Test-Path $Previous) { Remove-Item $Previous -Recurse -Force }
    New-Item -ItemType Directory -Path $Previous | Out-Null
    foreach ($name in $Artifacts) {
        $active = Join-Path $AppPath $name
        if (Test-Path $active) {
            Move-Item $active (Join-Path $Previous $name)
            $Saved += $name
        }
        Move-Item (Join-Path $Candidate $name) $active
        $Promoted += $name
    }
    Invoke-Boot $BootStart
    Assert-Healthy
    Write-Log '=== DEPLOY COMPLETED: HTML, API/BD, manifest y chunk OK ==='
    $ExitCode = 0
} catch {
    Write-Log $_.Exception.Message 'ERROR'
    if ($Stopped) {
        try {
            Set-Location $AppPath
            Invoke-Boot $BootStop
            foreach ($name in $Promoted) { Remove-Item (Join-Path $AppPath $name) -Recurse -Force }
            foreach ($name in $Saved) { Move-Item (Join-Path $Previous $name) (Join-Path $AppPath $name) }
            if ($SourceChanged) {
                git reset --hard $OldHead
                if ($LASTEXITCODE -ne 0) { throw 'No se pudo restaurar el codigo anterior' }
            }
            Invoke-Boot $BootStart
            Write-Log 'Runtime y codigo anteriores restaurados. El deploy sigue marcado como fallido.' 'WARN'
        } catch { Write-Log "RECUPERACION FALLO: $($_.Exception.Message). Conservar previous y revisar logs." 'ERROR' }
    } else { Write-Log 'Fallo de preparacion: runtime activo intacto.' 'WARN' }
} finally {
    # El workspace contiene copias de .env: retirarlo al terminar, incluso al fallar.
    Set-Location $AppPath
    if (Test-Path $Candidate) { Remove-Item $Candidate -Recurse -Force -ErrorAction SilentlyContinue }
    if (Test-Path $Archive) { Remove-Item $Archive -Force -ErrorAction SilentlyContinue }
    if ($Lock) { $Lock.Dispose() }
}
exit $ExitCode
