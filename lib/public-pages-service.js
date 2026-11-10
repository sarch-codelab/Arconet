import { prisma } from "./prisma";
import { PUBLIC_PAGES, publicPageDefaults, publicPageKey, publicPagesFromRows } from "./public-pages";

const keys = PUBLIC_PAGES.map(({ id }) => publicPageKey(id));
let cache = null;
let expiresAt = 0;
let pending = null;
const TTL_MS = 5000;

export async function readPublicPages(db = prisma) {
  const rows = await db.configuracionSistema.findMany({ where: { clave: { in: keys } }, select: { clave: true, valor: true } });
  return publicPagesFromRows(rows);
}

// Las peticiones de páginas comparten una consulta breve. Si la BD falla se
// conserva el último estado conocido; al arrancar sin BD se deja el sitio
// disponible. No se cachean los errores en la configuración administrativa.
export async function cachedPublicPages() {
  if (Date.now() < expiresAt && cache) return cache;
  if (pending) return pending;
  pending = (async () => {
    let timeout;
    try {
      const result = await Promise.race([
        readPublicPages(),
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("Tiempo agotado")), 1500); }),
      ]);
      cache = result;
    } catch (error) {
      console.error("No se pudo consultar la disponibilidad de páginas:", error?.message);
      cache ||= publicPageDefaults();
    } finally {
      clearTimeout(timeout);
      expiresAt = Date.now() + TTL_MS;
    }
    return cache;
  })();
  try { return await pending; } finally { pending = null; }
}
