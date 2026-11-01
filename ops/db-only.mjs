import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";
import { applyLocalMigrations, LOCAL_DATABASE } from "./local-database.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const config = JSON.parse(await readFile(path.join(root, ".local/arconet-preview/config.json"), "utf8"));
const postgres = new EmbeddedPostgres({
  databaseDir: path.join(root, ".local/arconet-preview/postgres"),
  user: LOCAL_DATABASE.user, password: config.databasePassword,
  port: LOCAL_DATABASE.port, authMethod: "scram-sha-256", persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  onLog: () => {},
});
import { existsSync } from "node:fs";
if (!existsSync(path.join(root, ".local/arconet-preview/postgres", "PG_VERSION"))) await postgres.initialise();
await postgres.start();
console.log("Postgres arriba en", LOCAL_DATABASE.port);
const admin = postgres.getPgClient("postgres", LOCAL_DATABASE.host);
await admin.connect();
try {
  const { rows } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [LOCAL_DATABASE.name]);
  if (!rows.length) await admin.query(`CREATE DATABASE "${LOCAL_DATABASE.name}"`);
} finally { await admin.end(); }
const db = postgres.getPgClient(LOCAL_DATABASE.name, LOCAL_DATABASE.host);
await db.connect();
try { await applyLocalMigrations(db, path.join(root, "prisma", "migrations")); } finally { await db.end(); }
if (process.env.SOLO_DB) { console.log("Solo base de datos."); await new Promise(() => {}); }
const env = {
  ...process.env, NODE_ENV: "production", NEXT_PUBLIC_LOCAL_PREVIEW: "1",
  DATABASE_URL: `postgresql://${LOCAL_DATABASE.user}:${encodeURIComponent(config.databasePassword)}@${LOCAL_DATABASE.host}:${LOCAL_DATABASE.port}/${LOCAL_DATABASE.name}?schema=public`,
  SESSION_SECRET: config.sessionSecret,
};
const dev = spawn("node_modules/next/dist/bin/next", ["start", "--hostname", "0.0.0.0", "--port", "3000"], { cwd: root, env, stdio: "inherit" });
const fin = async () => { dev.kill(); await postgres.stop(); process.exit(0); };
process.on("SIGTERM", fin); process.on("SIGINT", fin);
