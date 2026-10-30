import { requirePermission } from "@/lib/dal";
import { convertirCotizacionCompra } from "@/lib/compras";
import { writeLog } from "@/lib/logs";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(_request, { params }) {
  const guard = await requirePermission("compras:write");
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const order = await convertirCotizacionCompra(id, guard.session.correo);
    await writeLog("panel", `Cotización convertida a ${order.numero}`, {
      actor: guard.session.correo,
      ruta: `/api/ordenes-compra/${id}/convertir`,
      detalle: { compraId: order.id },
    });
    return Response.json({ id: order.id, numero: order.numero });
  } catch (error) {
    return Response.json(
      {
        error: error.status
          ? error.message
          : "No se pudo convertir la cotización.",
      },
      { status: error.status || 503 },
    );
  }
}
