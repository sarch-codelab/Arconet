import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/dal";
import { writeLog } from "@/lib/logs";
import { PUBLIC_PAGES, publicPageKey } from "@/lib/public-pages";
import { readPublicPages } from "@/lib/public-pages-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  const guard = await requirePermission("ajustes:read");
  if (guard.response) return guard.response;
  try {
    return Response.json({ pages: await readPublicPages() }, { headers });
  } catch (error) {
    console.error("GET /api/configuracion/paginas", error?.message);
    return Response.json({ error: "No se pudo cargar la disponibilidad de páginas." }, { status: 503, headers });
  }
}

export async function PATCH(request) {
  const guard = await requirePermission("ajustes:write");
  if (guard.response) return guard.response;
  if (!guard.permisos?.includes("ajustes:read")) return Response.json({ error: "Se requiere lectura y escritura de Ajustes." }, { status: 403, headers });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Solicitud inválida." }, { status: 400, headers }); }
  const page = PUBLIC_PAGES.find(({ id }) => id === body?.id);
  if (!page || typeof body?.enabled !== "boolean") return Response.json({ error: "Página o estado inválido." }, { status: 400, headers });
  try {
    const clave = publicPageKey(page.id);
    const valor = String(body.enabled);
    await prisma.configuracionSistema.upsert({ where: { clave }, create: { clave, valor }, update: { valor } });
    await writeLog("panel", `${body.enabled ? "Activó" : "Desactivó"} la página pública ${page.name}`, { actor: guard.session.correo, ruta: "/api/configuracion/paginas", detalle: { pagina: page.id, activa: body.enabled } });
    return Response.json({ id: page.id, enabled: body.enabled }, { headers });
  } catch (error) {
    console.error("PATCH /api/configuracion/paginas", error?.message);
    return Response.json({ error: "No se pudo actualizar la página." }, { status: 503, headers });
  }
}
