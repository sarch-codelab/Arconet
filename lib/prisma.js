import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis;

const TRANSIENT_CODES = new Set([
  "P1001", // Can't reach database server
  "P1002", // Connection timed out
  "P1008", // Operations timed out
  "P1017", // Server closed connection
  "P2024", // Timed out fetching connection from pool
]);

function isTransient(error) {
  if (!error) return false;
  if (TRANSIENT_CODES.has(error.code)) return true;
  const msg = String(error.message || "").toLowerCase();
  return (
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("econnrefused") ||
    msg.includes("connection terminated") ||
    msg.includes("connection closed") ||
    msg.includes("server closed the connection")
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX) || 30,
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
    connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 10000,
    statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS) || 15000,
  });
  const base = new PrismaClient({ adapter });

  // Transparent retry for transient connection/pool errors (idempotent at DB level).
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          let lastError;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              return await query(args);
            } catch (error) {
              lastError = error;
              if (!isTransient(error) || attempt === 2) throw error;
              await sleep(50 * (attempt + 1));
            }
          }
          throw lastError;
        },
      },
    },
  });
}

export const prisma = globalForPrisma.__prisma ?? createClient();

if (!globalForPrisma.__prisma) {
  globalForPrisma.__prisma = prisma;
}

// Graceful shutdown: release pool on process termination.
if (!globalForPrisma.__prismaShutdownRegistered) {
  globalForPrisma.__prismaShutdownRegistered = true;
  const shutdown = async () => {
    try {
      await prisma.$disconnect();
    } catch {}
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
