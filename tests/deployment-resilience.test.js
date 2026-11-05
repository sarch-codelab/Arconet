import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile, utimes, rm, symlink } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { retainStaticAssets } from '../ops/retain-static-assets.mjs';
const roots = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(dir => rm(dir, { recursive: true, force: true }))); });
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'arconet-assets-')); roots.push(root);
  const old = path.join(root, 'old'), next = path.join(root, 'next');
  await mkdir(path.join(old, 'chunks'), { recursive: true });
  await mkdir(path.join(next, 'chunks'), { recursive: true });
  return { root, old, next };
}
describe('Assets entre despliegues', () => {
  it('retiene chunks anteriores sin reemplazar los del nuevo build', async () => {
    const { old, next } = await fixture();
    await writeFile(path.join(old, 'chunks', 'old.js'), 'old');
    await writeFile(path.join(old, 'chunks', 'shared.js'), 'previous');
    await writeFile(path.join(next, 'chunks', 'shared.js'), 'new');
    expect(await retainStaticAssets(old, next)).toBe(1);
    expect(await readFile(path.join(next, 'chunks', 'old.js'), 'utf8')).toBe('old');
    expect(await readFile(path.join(next, 'chunks', 'shared.js'), 'utf8')).toBe('new');
  });
  it('no rejuvenece archivos retenidos y expira los de mas de 7 dias', async () => {
    const { root, old, next } = await fixture();
    const now = Date.now(), age = new Date(now - 6 * 86400000);
    await writeFile(path.join(old, 'chunks', 'old.js'), 'old');
    await utimes(path.join(old, 'chunks', 'old.js'), age, age);
    expect(await retainStaticAssets(old, next, { now })).toBe(1);
    expect(await retainStaticAssets(next, path.join(root, 'third'), { now: now + 2 * 86400000 })).toBe(0);
  });
  it('primer deploy tolera que no haya static anterior', async () => {
    const { root, next } = await fixture();
    expect(await retainStaticAssets(path.join(root, 'missing'), next)).toBe(0);
  });
  it('no sigue enlaces a archivos privados', async () => {
    const { root, old, next } = await fixture();
    await writeFile(path.join(root, 'private.env'), 'private');
    await symlink(path.join(root, 'private.env'), path.join(old, 'leak'));
    expect(await retainStaticAssets(old, next)).toBe(0);
  });
  it('rechaza copiar sobre el mismo directorio', async () => {
    const { old } = await fixture();
    await expect(retainStaticAssets(old, old)).rejects.toThrow('must differ');
  });
});

describe('Contrato de despliegue Windows', () => {
  const deploy = readFileSync('deploy.ps1', 'utf8');
  it('instala y compila en candidato ANTES de detener o modificar el activo', () => {
    const build = deploy.indexOf("Invoke-Npm -NpmArgs @('run', 'build')");
    expect(deploy.indexOf("Invoke-Npm -NpmArgs @('ci'")).toBeLessThan(build);
    expect(deploy.indexOf('Invoke-Boot $BootStop', build)).toBeGreaterThan(build);
    expect(deploy.indexOf('git reset --hard $Target')).toBeGreaterThan(build);
    expect(deploy.indexOf("Invoke-Npm -NpmArgs @('run', 'db:migrate')")).toBeGreaterThan(deploy.indexOf('Invoke-Boot $BootStop', build));
  });
  it('conserva y restaura el runtime completo, no solo .next', () => {
    expect(deploy).toContain("$Artifacts = @('.next', 'node_modules', 'generated')");
    expect(deploy).toContain('foreach ($name in $Saved)');
    expect(deploy).toContain('git reset --hard $OldHead');
    expect(deploy).toContain('$Promoted += $name');
    expect(deploy).toContain('retain-static-assets.mjs');
  });
  it('health check cubre API/BD, manifest y chunk ademas de HTML', () => {
    for (const value of ['/api/health', '/manifest.webmanifest', 'Content-Type', 'javascript']) expect(deploy).toContain(value);
  });
  it('watchdog y deploy comparten un lock de handle, no un marcador obsoleto', () => {
    const watchdog = readFileSync('ops/watchdog.ps1', 'utf8');
    for (const value of [deploy, watchdog]) {
      expect(value).toContain("'deploy.lock'");
      expect(value).toContain('[System.IO.File]::Open(');
    }
    expect(deploy).toContain('$Lock.Dispose()');
    expect(watchdog.indexOf("'deploy.lock'")).toBeLessThan(watchdog.indexOf('Invoke-WebRequest'));
  });
  it('no usa ?dpl= y conserva los assets inmutables entre builds', () => {
    const start = readFileSync('ops/start-arconet.ps1', 'utf8');
    const config = readFileSync('next.config.mjs', 'utf8');
    expect(deploy).not.toContain('NEXT_DEPLOYMENT_ID = $Target');
    expect(deploy).not.toContain("Set-Content -Path '.next\\DEPLOYMENT_ID'");
    expect(deploy).toContain('retain-static-assets.mjs');
    expect(start).not.toContain("$env:NEXT_DEPLOYMENT_ID = (Get-Content");
    expect(config).toContain('delete process.env.NEXT_DEPLOYMENT_ID');
    expect(deploy.slice(deploy.indexOf('} finally {'))).toContain('Remove-Item $Candidate -Recurse -Force');
  });

  it('el health check cubre todas las rutas criticas y cada chunk JavaScript', () => {
    for (const value of ['/admin', '/contacto', '/tienda', '?dpl=', 'HashSet[string]', 'Content-Type', 'javascript']) {
      expect(deploy).toContain(value);
    }
  });

  it('verifica los chunks en disco antes de promover', () => {
    const build = deploy.indexOf("Invoke-Npm -NpmArgs @('run', 'build')");
    expect(deploy.indexOf('verify-static-assets.mjs', build)).toBeGreaterThan(build);
    expect(deploy.indexOf('Invoke-Boot $BootStop', build)).toBeGreaterThan(deploy.indexOf('verify-static-assets.mjs', build));
  });

  it('el health check pide por HTTP todos los chunks que hay en disco', () => {
    // En produccion app/admin/page-*.js estaba en .next y aun asi respondia
    // 500 text/plain. Revisar solo el HTML no habria detectado el caso.
    expect(deploy).toContain("Get-ChildItem $chunksRoot -Recurse -File -Filter '*.js'");
    expect(deploy).toContain('Chunk vacio en disco');
    expect(deploy).toContain("se exige JavaScript 200");
    expect(deploy).toContain('todos los del disco');
  });

  it('el poller no se bloquea para siempre por un resultado 267009 residual', () => {
    const poller = readFileSync('ops/poller.ps1', 'utf8');
    expect(poller).not.toContain("$cur.State -eq 'Running' -or $cur.LastTaskResult -eq $RUNNING_CODE");
    expect(poller).toContain("if ($cur.State -eq 'Running')");
    expect(poller).toContain('Resultado 267009 residual');
    expect(poller).toContain('$stateAge.TotalMinutes');
  });
});
