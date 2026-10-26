#!/usr/bin/env node
/**
 * Respaldo de datos de la base de datos de Arconet.
 *
 * El esquema se recupera reaplicando prisma/migrations (git); este respaldo
 * guarda los DATOS de todas las tablas en JSONL comprimido + manifiesto con
 * el estado de migraciones al momento de copiar.
 *
 * Uso:
 *   node ops/backup-db.mjs              → ops/backups/arconet-<fecha>.jsonl.gz
 *   node ops/backup-db.mjs --out ruta   → ruta/arconet-<fecha>.jsonl.gz
 *
 * Restauración (línea por tabla):
 *   const { table, rows } = JSON.parse(linea);
 */
import "dotenv/config";
import { Client } from "pg";
import { createWriteStream, mkdirSync, readdirSync, statSync } from "node:fs";
import { createGzip } from "node:zlib";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const argOut = process.argv.indexOf("--out");
const outDir = argOut !== -1 ? process.argv[argOut + 1] : "ops/backups";

if (!process.env.DATABASE_URL) {
  console.error("ERROR: falta DATABASE_URL en .env");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = `${outDir}/arconet-${stamp}.jsonl.gz`;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const { rows: tableRows } = await client.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
);
const tables = tableRows.map((r) => r.table_name);

const { rows: extRows } = await client.query(
  "SELECT extname FROM pg_extension WHERE extname <> 'plpgsql' ORDER BY extname"
);

const migrations = readdirSync("prisma/migrations", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const manifest = {
  tipo: "manifiesto",
  fecha: new Date().toISOString(),
  base: new URL(process.env.DATABASE_URL).pathname.replace("/", ""),
  migracionesPrisma: migrations,
  extensiones: extRows.map((r) => r.extname),
  tablas: {},
};

const lines = [JSON.stringify(manifest)];
let total = 0;

for (const table of tables) {
  const { rows } = await client.query(`SELECT * FROM "${table}"`);
  manifest.tablas[table] = rows.length;
  total += rows.length;
  // Identificadores provienen de information_schema, siempre seguros entre comillas.
  lines.push(JSON.stringify({ tabla: table, filas: rows.length, datos: rows }));
  process.stdout.write(`  ${table}: ${rows.length} filas\n`);
}

manifest.tablas = manifest.tablas; // ya serializado arriba
await pipeline(Readable.from(lines), createGzip({ level: 9 }), createWriteStream(file));
await client.end();

const size = statSync(file).size;
console.log(`\nRespaldo listo: ${file}`);
console.log(`  ${tables.length} tablas, ${total} filas, ${(size / 1024).toFixed(1)} kB comprimido`);
console.log(`  Migraciones al momento del respaldo: ${migrations.length} (última: ${migrations.at(-1) || "ninguna"})`);
