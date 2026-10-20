import { prisma } from "./prisma";

export const LOG_CATEGORIES = ["auth", "api", "db", "sistema", "panel"];
export const LOG_LEVELS = ["info", "warn", "error"];

const CATEGORY_LABELS = {
  auth: "Autenticación",
  api: "API",
  db: "Base de datos",
  sistema: "Sistema",
  panel: "Panel",
};

const LEVEL_LABELS = {
  info: "Info",
  warn: "Aviso",
  error: "Error",
};

export function categoryLabel(category) {
  return CATEGORY_LABELS[category] || category;
}

export function levelLabel(level) {
  return LEVEL_LABELS[level] || level;
}

function normalizeContext(context = {}) {
  const detail = context.detalle ?? context.detail ?? null;
  let serialized = null;
  if (detail != null) {
    if (typeof detail === "string") {
      serialized = detail;
    } else {
      try {
        serialized = JSON.stringify(detail);
      } catch {
        serialized = String(detail);
      }
    }
  }
  return {
    detalle: serialized,
    actor: context.actor ?? context.usuario ?? null,
    ruta: context.ruta ?? context.path ?? null,
  };
}

/**
 * Registra un evento en la tabla Log. Nunca lanza: si falla el guardado,
 * se ignora para no romper la petición que lo invocó.
 */
export async function writeLog(categoria, mensaje, { nivel = "info", ...context } = {}) {
  try {
    const { detalle, actor, ruta } = normalizeContext(context);
    return await prisma.log.create({
      data: {
        categoria: LOG_CATEGORIES.includes(categoria) ? categoria : "sistema",
        nivel: LOG_LEVELS.includes(nivel) ? nivel : "info",
        mensaje: String(mensaje || "").slice(0, 500),
        detalle,
        actor,
        ruta,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[log]", categoria, mensaje, error?.message);
    }
    return null;
  }
}

export async function listLogs({ categoria, nivel, limit = 100, since } = {}) {
  const where = {};
  if (categoria && categoria !== "todas") where.categoria = categoria;
  if (nivel && nivel !== "todos") where.nivel = nivel;
  if (since) {
    const date = new Date(since);
    if (!Number.isNaN(date.getTime())) where.createdAt = { gt: date };
  }

  return prisma.log.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(Number(limit) || 100, 1), 500),
  });
}

export function serializeLog(log) {
  return {
    id: log.id,
    nivel: log.nivel,
    categoria: log.categoria,
    mensaje: log.mensaje,
    detalle: log.detalle,
    actor: log.actor,
    ruta: log.ruta,
    createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : log.createdAt,
  };
}
