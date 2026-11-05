import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// `npm run build` fallaba en entornos sin salida a binaries.prisma.sh porque
// `prisma generate` intentaba descargar el schema-engine nativo. Prisma 7 trae
// ese motor compilado a WASM dentro del propio paquete.

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const ci = readFileSync(".github/workflows/ci.yml", "utf8");
const wrapper = readFileSync("scripts/prisma-cli.mjs", "utf8");

describe("Prisma sin descargar el motor nativo", () => {
  it("build y CI usan el wrapper con el motor WASM incluido", () => {
    expect(pkg.scripts.build).toContain("node scripts/prisma-cli.mjs generate");
    expect(pkg.scripts.build).toContain("next build --webpack");
    expect(ci).toContain("node scripts/prisma-cli.mjs validate");
    expect(wrapper).toContain("schema_engine_bg.wasm");
    expect(wrapper).toContain('OFFLINE_COMMANDS = new Set(["generate", "validate"])');
    expect(wrapper).toContain("PRISMA_SCHEMA_ENGINE_BINARY");
    // migrate deploy ejecuta el motor como proceso: un .wasm no es ejecutable.
    expect(wrapper).not.toContain('"migrate"');
  });

  it("el wrapper valida el esquema sin red", () => {
    const result = spawnSync(process.execPath, ["scripts/prisma-cli.mjs", "validate"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: "postgresql://ci:ci@localhost:5432/ci?schema=public",
      },
      encoding: "utf8",
      timeout: 30_000,
    });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout + result.stderr).toMatch(/is valid/i);
  });
});
