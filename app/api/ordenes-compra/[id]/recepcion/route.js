import { recibirEnOC } from '@/lib/compras';
import { requirePermission } from '@/lib/dal';
import { receivingDTO } from '@/lib/compras-dto';
import { writeLog } from '@/lib/logs';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recepción de mercadería contra una OC.
 * Body: { bodegaId?, items: [{ itemId, cantidad, costoUnitario? }], notas? }
 * Genera entradas en el kardex y pasa la OC a `parcial` o `recibida`.
 */
export async function POST(request, { params }) {
  const guard = await requirePermission("compras:receive");
  if (guard.response) return guard.response;
  const inventory = await requirePermission("inventario:write");
  if (inventory.response) return inventory.response;
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  try {
    const { orden, recibido, replayed } = await recibirEnOC({
      ocId: id,
      requestId: body?.requestId,
      bodegaId: typeof body?.bodegaId === "string" ? body.bodegaId : null,
      items: Array.isArray(body?.items) ? body.items : [],
      notas: typeof body?.notas === "string" ? body.notas.trim().slice(0, 500) : null,
      actor: guard.session.correo,
    });

    if (!replayed) await writeLog("panel", `Recepción en OC ${orden.numero}: ${recibido.length} ítem(s)`, {
      actor: guard.session.correo,
      ruta: `/api/ordenes-compra/${id}/recepcion`,
      detalle: { recibido, estado: orden.estado },
    });

    return Response.json({ ok: true, orden: receivingDTO(orden), recibido, replayed });
  } catch (error) {
    if (error?.status) return Response.json({ error: error.message }, { status: error.status });
    console.error("POST /api/ordenes-compra/[id]/recepcion", error);
    return Response.json({ error: "No se pudo registrar la recepción." }, { status: 500 });
  }
}
