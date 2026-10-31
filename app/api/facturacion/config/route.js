import { prisma } from "@/lib/prisma";
import { requirePermission, requireSession, getPermisos } from "@/lib/dal";
import { loadFiscalSettings, saveFiscalSettings } from "@/lib/fiscal-settings-service";
import { fiscalRuntimeConfig } from "@/lib/fiscal-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  try {
    const permissions = await getPermisos(guard.session);
    if (!permissions.includes("ajustes:read") && !permissions.includes("facturacion:read")) return Response.json({ error: "No autorizado." }, { status: 403 });
    const config = await loadFiscalSettings(prisma);
    // Ventas sólo necesita saber si puede emitir y qué impide hacerlo. Los
    // controles y valores editables de autorización pertenecen a Ajustes.
    return Response.json(permissions.includes("ajustes:read") ? config : fiscalRuntimeConfig(config), { headers });
  } catch (error) {
    console.error("GET /api/facturacion/config", error?.message);
    return Response.json({ error: "No se pudo leer el estado de la configuración fiscal." }, { status: 503 });
  }
}

export async function PUT(request) {
  const guard = await requirePermission("ajustes:write");
  if (guard.response) return guard.response;
  if (!guard.permisos?.includes("ajustes:read")) return Response.json({ error: "Se requiere lectura y escritura de Ajustes." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON inválido." }, { status: 400 }); }
  try {
    return Response.json(await saveFiscalSettings(prisma, body, guard.session.correo), { headers });
  } catch (error) {
    if (error.status) return Response.json({ error: error.message, ...(error.issues ? { issues: error.issues } : {}) }, { status: error.status });
    console.error("PUT /api/facturacion/config", error?.message);
    return Response.json({ error: "No se pudo guardar la configuración fiscal. No se aplicaron cambios parciales." }, { status: 503 });
  }
}
