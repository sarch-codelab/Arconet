import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import EmbeddedPostgres from "embedded-postgres";
import { applyLocalMigrations, assertLocalDatabase, LOCAL_DATABASE } from "./local-database.mjs";

if (process.env.NODE_ENV === "production") {
  throw new Error("dev:local no puede ejecutarse en producción.");
}
const { values } = parseArgs({ options: { port: { type: "string", default: "3000" } } });
const port = Number(values.port);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Puerto web inválido.");
const root = fileURLToPath(new URL("../", import.meta.url));
const stateDir = path.join(root, ".local", "arconet-preview");
await mkdir(stateDir, { recursive: true, mode: 0o700 });
const configFile = path.join(stateDir, "config.json");
if (!existsSync(configFile)) {
  await writeFile(configFile, JSON.stringify({
    databasePassword: randomBytes(32).toString("hex"),
    sessionSecret: randomBytes(32).toString("hex"),
  }), { mode: 0o600, flag: "wx" });
}
const config = JSON.parse(await readFile(configFile, "utf8"));
if (typeof config.databasePassword !== "string" || config.databasePassword.length < 32 ||
    typeof config.sessionSecret !== "string" || config.sessionSecret.length < 32) {
  throw new Error("Configuración local inválida; no se inició la base.");
}
const env = {
  ...process.env,
  NODE_ENV: "development",
  NEXT_PUBLIC_LOCAL_PREVIEW: "1",
  DATABASE_URL: `postgresql://${LOCAL_DATABASE.user}:${encodeURIComponent(config.databasePassword)}@${LOCAL_DATABASE.host}:${LOCAL_DATABASE.port}/${LOCAL_DATABASE.name}?schema=public`,
  SESSION_SECRET: config.sessionSecret,
  // No usar SMTP ni los datos de producción aunque exista un .env del Xeon.
  SMTP_HOST: "", SMTP_PORT: "", SMTP_USER: "", SMTP_PASS: "",
  EMAIL_FROM: "Arconet local <no-reply@arconet.local>",
  NEXT_PUBLIC_CONTACT_EMAIL: "contacto@arconet.local",
  APP_ORIGIN: process.env.E2B_SANDBOX_ID ? `https://${port}-${process.env.E2B_SANDBOX_ID}.e2b.app` : "",
  NEXT_TELEMETRY_DISABLED: "1",
};
assertLocalDatabase(env);
const postgres = new EmbeddedPostgres({
  databaseDir: path.join(stateDir, "postgres"),
  user: LOCAL_DATABASE.user,
  password: config.databasePassword,
  port: LOCAL_DATABASE.port,
  authMethod: "scram-sha-256",
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-h", LOCAL_DATABASE.host, "-k", stateDir],
  onLog: (message) => {
    if (/ready to accept connections|FATAL|PANIC/.test(message)) console.log(`[PostgreSQL local] ${message.trim()}`);
  },
});
let child;
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  if (child && child.exitCode === null) {
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.kill("SIGTERM");
    const timeout = setTimeout(() => child?.kill("SIGKILL"), 5000);
    await exited;
    clearTimeout(timeout);
  }
  await postgres.stop();
}
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => { stop().then(() => process.exit(0)); });
}
function run(args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    child = spawn(process.execPath, args, { cwd: root, env: { ...env, ...extraEnv }, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      child = undefined;
      if (code === 0 || stopping) resolve();
      else reject(new Error(`${args[0]} terminó con ${code ?? signal}.`));
    });
  });
}
try {
  if (!existsSync(path.join(stateDir, "postgres", "PG_VERSION"))) await postgres.initialise();
  await postgres.start();
  const admin = postgres.getPgClient("postgres", LOCAL_DATABASE.host);
  await admin.connect();
  try {
    const { rows } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [LOCAL_DATABASE.name]);
    if (!rows.length) await admin.query(`CREATE DATABASE "${LOCAL_DATABASE.name}"`);
  } finally { await admin.end(); }
  const db = postgres.getPgClient(LOCAL_DATABASE.name, LOCAL_DATABASE.host);
  let needsSeed;
  await db.connect();
  try {
    await applyLocalMigrations(db, path.join(root, "prisma", "migrations"));
    const { rows } = await db.query('SELECT 1 FROM "ConfiguracionSistema" WHERE clave = $1', ["local.seed.version"]);
    needsSeed = rows.length === 0;
  } finally { await db.end(); }
  await run(["node_modules/prisma/build/index.js", "generate"]);
  if (needsSeed) {
    await run(["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"], { SEED_ADMIN_PASSWORD: randomBytes(24).toString("hex") });
    await run(["node_modules/tsx/dist/cli.mjs", "prisma/seed-local.ts"]);
  }
  console.log("\nARCONET · ENTORNO LOCAL DE PRUEBAS");
  console.log("PostgreSQL 17: 127.0.0.1:55432 / arconet_local (solo loopback)");
  console.log("Administración: /admin → admin / 1234");
  console.log("Portal de clientes: /login → cliente@arconet.local / 1234");
  console.log("Correos: modo consola y bitácora. Sin conexiones a producción.");
  console.log("Los cambios se conservan al reiniciar dentro de este entorno.\n");
  await run(["node_modules/next/dist/bin/next", "dev", "--hostname", "0.0.0.0", "--port", String(port)]);
} catch (error) {
  console.error("No se pudo iniciar la vista previa local:", error?.message || error);
  process.exitCode = 1;
} finally {
  await stop();
}
