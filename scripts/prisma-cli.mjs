#!/usr/bin/env node
/**
 * Ejecuta los comandos de Prisma que NO necesitan el binario nativo descargado
 * desde binaries.prisma.sh.
 *
 * Prisma 7 incluye el motor de esquema compilado a WASM dentro del propio
 * paquete (`build/schema_engine_bg.wasm`). Apuntando
 * PRISMA_SCHEMA_ENGINE_BINARY a ese archivo, `generate` y `validate` funcionan
 * sin red: antes `npm run build` fallaba en entornos con el host de binaries
 * bloqueado y había que generar un cliente falso sólo para compilar.
 *
 * NO se aplica a `migrate deploy`: ese comando ejecuta el motor como proceso
 * y un .wasm no es ejecutable (EACCES). Las migraciones siguen usando el
 * binario nativo que instala npm ci en el servidor, donde sí hay salida a red.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prismaBuild = path.join(root, "node_modules", "prisma", "build");
const cli = path.join(prismaBuild, "index.js");
const wasm = path.join(prismaBuild, "schema_engine_bg.wasm");

const [command = "generate", ...args] = process.argv.slice(2);
const OFFLINE_COMMANDS = new Set(["generate", "validate"]);

if (!existsSync(cli)) {
  console.error(`[prisma-cli] No se encontró el CLI de Prisma en ${cli}. Ejecuta npm ci.`);
  process.exit(1);
}

const env = { ...process.env };
if (OFFLINE_COMMANDS.has(command) && !env.PRISMA_SCHEMA_ENGINE_BINARY && existsSync(wasm)) {
  env.PRISMA_SCHEMA_ENGINE_BINARY = wasm;
}

const result = spawnSync(process.execPath, [cli, command, ...args], {
  cwd: root,
  env,
  stdio: "inherit",
});

if (result.error) {
  console.error(`[prisma-cli] ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
