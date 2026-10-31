import { prisma } from "@/lib/prisma";
import { getPermisos, requireSession } from "@/lib/dal";
import { getAdminSummary } from "@/lib/admin-summary-service";
import { canReadScopedSummary } from "@/lib/permisos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  try {
    const permisos = await getPermisos(guard.session);
    if (!canReadScopedSummary(permisos)) return Response.json({ error: "No autorizado." }, { status: 403 });
    const data = await getAdminSummary(prisma, guard.session, permisos);
    return Response.json(data, { headers: { "Cache-Control": "private, no-store", "Vary": "Cookie, X-Arconet-Preview-Session" } });
  } catch (error) {
    console.error("GET /api/resumen", error?.message);
    return Response.json({ error: "No se pudo actualizar el resumen. Reintenta; no se muestran ceros como si fueran datos válidos." }, { status: 503 });
  }
}
