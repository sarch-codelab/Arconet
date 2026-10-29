import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const LOCAL_DATABASE = { host: "127.0.0.1", port: 55432, name: "arconet_local", user: "arconet_local" };

// Los datos y las contraseñas de demostración nunca se cargan en otra base.
export function assertLocalDatabase(env = process.env) {
  if (env.NODE_ENV !== "development" || env.NEXT_PUBLIC_LOCAL_PREVIEW !== "1") {
    throw new Error("La base de demostración solo está permitida en desarrollo local.");
  }
  const url = new URL(env.DATABASE_URL);
  if (
    !["postgresql:", "postgres:"].includes(url.protocol) ||
    url.hostname !== LOCAL_DATABASE.host ||
    url.port !== String(LOCAL_DATABASE.port) ||
    url.pathname !== `/${LOCAL_DATABASE.name}` ||
    url.username !== LOCAL_DATABASE.user
  ) {
    throw new Error("Operación rechazada: la base debe ser arconet_local en 127.0.0.1:55432.");
  }
}

// Solo para el clúster aislado de desarrollo. Usa los SQL originales sin
// descargar el motor nativo de Prisma; conserva su historial y checksums.
export async function applyLocalMigrations(client, directory) {
  await client.query(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) PRIMARY KEY,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
  )`);
  await client.query("SELECT pg_advisory_lock(72707369)");
  try {
    const entries = (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    for (const name of entries) {
      const sql = await readFile(path.join(directory, name, "migration.sql"), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const { rows } = await client.query(
        'SELECT checksum, finished_at FROM "_prisma_migrations" WHERE migration_name = $1 AND rolled_back_at IS NULL', [name],
      );
      if (rows.length) {
        if (rows[0].checksum !== checksum || !rows[0].finished_at) {
          throw new Error(`La migración local ${name} cambió o está incompleta; no se modificó la base.`);
        }
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO "_prisma_migrations" (id, checksum, migration_name, finished_at, applied_steps_count) VALUES ($1, $2, $3, NOW(), 1)',
          [randomUUID(), checksum, name],
        );
        await client.query("COMMIT");
        console.log(`Migración local aplicada: ${name}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(72707369)");
  }
}
