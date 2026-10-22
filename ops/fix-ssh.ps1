<#
    Habilita el acceso SSH por clave para el deploy de GitHub Actions.
    Ejecutar como Administrador.  Log: C:\arconet\logs\elev-ssh.log

    Windows OpenSSH, para usuarios del grupo Administradores, lee la clave
    publica de C:\ProgramData\ssh\administrators_authorized_keys (no de
    ~/.ssh/authorized_keys).

    IMPORTANTE: en un Windows en espanol el grupo se llama "Administradores",
    asi que hay que usar los SID (*S-1-5-32-544) y no el nombre en ingles.
#>

$ErrorActionPreference = 'Continue'
$LogFile = 'C:\arconet\logs\elev-ssh.log'
New-Item -ItemType Directory -Force -Path 'C:\arconet\logs' | Out-Null
function W { param($m,$l='INFO') Add-Content -Path $LogFile -Value ('[{0}] [{1}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'),$l,$m) -Encoding UTF8 }

$pubFiles = @(
    'C:\Users\Norman Zuniga\.ssh\id_arconet_deploy.pub',
    'C:\Users\Norman Zuniga\.ssh\id_arconet.pub'
)
$adminKeys = 'C:\ProgramData\ssh\administrators_authorized_keys'
$userKeys  = 'C:\Users\Norman Zuniga\.ssh\authorized_keys'

$keys = @()
foreach ($f in $pubFiles) {
    if (Test-Path $f) { $keys += (Get-Content $f -Raw).Trim(); W "OK  clave leida: $f" }
    else { W "WARN no existe $f" 'WARN' }
}
if ($keys.Count -eq 0) { W "No hay claves publicas" 'ERROR'; exit 1 }
$content = ($keys -join "`n") + "`n"

function Set-AuthorizedKeys {
    param([string] $Path, [string[]] $GrantSids)

    # 1. Recuperar el control del archivo si quedo con ACL rota
    if (Test-Path $Path) {
        $t = takeown /f $Path /a 2>&1
        W "    takeown: $($t -join ' ')"
        $r = icacls $Path /reset 2>&1
        W "    icacls /reset: $(($r -join ' ').Trim())"
    }

    # 2. Escribir el contenido
    try {
        Set-Content -Path $Path -Value $content -Encoding ascii -NoNewline -ErrorAction Stop
    } catch {
        W "ERR no se pudo escribir $Path : $($_.Exception.Message)" 'ERROR'
        return $false
    }

    # 3. ACL estricta usando SIDs (independiente del idioma)
    icacls $Path /inheritance:r 2>&1 | Out-Null
    $grantArgs = @()
    foreach ($sid in $GrantSids) { $grantArgs += "${sid}:F" }
    $g = icacls $Path /grant $grantArgs 2>&1
    W "    icacls grant: $(($g -join ' ').Trim())"

    W "OK  $Path ($((Get-Item $Path).Length) bytes)"
    return $true
}

W "--- Claves del usuario ---"
Set-AuthorizedKeys -Path $userKeys -GrantSids @('*S-1-5-32-544','*S-1-5-18') | Out-Null
W "--- Claves de administradores (la que usa sshd) ---"
Set-AuthorizedKeys -Path $adminKeys -GrantSids @('*S-1-5-32-544','*S-1-5-18') | Out-Null

# Reiniciar sshd
try {
    Restart-Service sshd -Force -ErrorAction Stop
    Start-Sleep -Seconds 2
    W "OK  sshd reiniciado: $((Get-Service sshd).Status)"
} catch { W "ERR reiniciando sshd: $($_.Exception.Message)" 'ERROR' }

try {
    W "VER sshd=$((Get-Service sshd).Status) puerto22=$([bool](Get-NetTCPConnection -LocalPort 22 -State Listen -ErrorAction SilentlyContinue))"
    W "VER adminKeys=$((Get-Item $adminKeys).Length) bytes  userKeys=$((Get-Item $userKeys).Length) bytes"
} catch { }

W "=== FIN ==="
