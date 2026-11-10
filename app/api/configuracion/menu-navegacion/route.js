import { requirePermission } from "@/lib/dal";
import { writeLog } from "@/lib/logs";
import { readDockMenu, saveDockMenu } from "@/lib/dock-menu-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  const guard = await requirePermission("ajustes:read");
  if (guard.response) return guard.response;
  try { const { menu, revision, corrupt } = await readDockMenu(); return Response.json({ menu, revision, corrupt }, { headers }); }
  catch (error) { console.error("GET menú 2", error?.message); return Response.json({ error: "No se pudo cargar el menú." }, { status: 503, headers }); }
}

export async function PUT(request) {
  const guard = await requirePermission("ajustes:write");
  if (guard.response) return guard.response;
  if (!guard.permisos?.includes("ajustes:read")) return Response.json({ error: "Se requiere lectura y escritura de Ajustes." }, { status: 403, headers });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Solicitud inválida." }, { status: 400, headers }); }
  if (typeof body?.revision !== "string") return Response.json({ error: "Falta la revisión del menú." }, { status: 400, headers });
  try {
    const saved = await saveDockMenu(body.menu, body.revision);
    await writeLog("panel", "Actualizó el menú de navegación 2", { actor: guard.session.correo, ruta: "/api/configuracion/menu-navegacion" });
    return Response.json(saved, { headers });
  } catch (error) {
    if (error.status) return Response.json({ error: error.message }, { status: error.status, headers });
    console.error("PUT menú 2", error?.message); return Response.json({ error: "No se pudo guardar el menú." }, { status: 503, headers });
  }
}
