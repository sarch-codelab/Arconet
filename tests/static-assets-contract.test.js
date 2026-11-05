import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { verifyStaticAssets } from "../ops/verify-static-assets.mjs";

const roots = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))); });

async function fixture({ admin = true, missing = false, empty = false } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "arconet-verify-"));
  roots.push(root);
  const html = path.join(root, ".next", "server", "app");
  const statics = path.join(root, ".next", "static", "chunks");
  await mkdir(html, { recursive: true });
  await mkdir(path.join(statics, "app", "admin"), { recursive: true });
  await writeFile(path.join(statics, "webpack-abc.js"), "runtime");
  await writeFile(path.join(html, "index.html"), '<script src="/_next/static/chunks/webpack-abc.js"></script>');
  if (!missing) await writeFile(path.join(statics, "shared.js"), "shared");
  if (empty) await writeFile(path.join(statics, "shared.js"), "");
  await writeFile(path.join(html, "contacto.html"), '<script src="/_next/static/chunks/shared.js"></script>');
  if (admin) await writeFile(path.join(statics, "app", "admin", "page-abc.js"), "admin");
  return root;
}

describe("verificación de chunks antes de promover", () => {
  it("acepta un build con todos sus assets y el chunk de /admin", async () => {
    const root = await fixture();
    await expect(verifyStaticAssets({ root })).resolves.toMatchObject({ html: 2, admin: true });
  });

  it("detecta un chunk referenciado que no existe", async () => {
    const root = await fixture({ missing: true });
    await expect(verifyStaticAssets({ root })).rejects.toThrow(/ausentes o vacíos/);
  });

  it("detecta un chunk vacío", async () => {
    const root = await fixture({ empty: true });
    await expect(verifyStaticAssets({ root })).rejects.toThrow(/ausentes o vacíos/);
  });

  it("detecta que falta el chunk de /admin aunque ningún HTML lo referencie", async () => {
    const root = await fixture({ admin: false });
    await expect(verifyStaticAssets({ root })).rejects.toThrow(/\/admin/);
  });

  it("deploy.ps1 y CI ejecutan la verificación antes de publicar", () => {
    const deploy = readFileSync("deploy.ps1", "utf8");
    const ci = readFileSync(".github/workflows/ci.yml", "utf8");
    const stop = deploy.indexOf("Invoke-Boot $BootStop");
    expect(deploy.indexOf("verify-static-assets.mjs")).toBeGreaterThan(deploy.indexOf("Invoke-Npm -NpmArgs @('run', 'build')"));
    expect(deploy.indexOf("verify-static-assets.mjs")).toBeLessThan(stop);
    expect(ci).toContain("node ops/verify-static-assets.mjs");
  });
});
