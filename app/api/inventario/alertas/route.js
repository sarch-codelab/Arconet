import { requirePermission } from '@/lib/dal";
import { alertasReabastecimiento } from '@/lib/inventario";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Alertas de reabastecimiento: productos en o bajo el punto de reorden. */
export async function GET() {
  const guard = await requirePermission("inventario:read");
  if (guard.response) return guard.response;
  try {
    const resultado = await alertasReabastecimiento();
    return Response.json(resultado);
  } catch (error) {
    console.error("GET /api/inventario/alertas", error?.message);
    return Response.json({ error: "No se pudieron calcular las alertas." }, { status: 500 });
  }
}
