import { requirePermission } from "../../../../lib/dal";
import { stockPorBodega } from "../../../../lib/inventario";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const guard = await requirePermission("inventario:read");
  if (guard.response) return guard.response;
  const { searchParams } = new URL(request.url);
  try {
    const filas = await stockPorBodega({
      productoId: searchParams.get("productoId") || null,
      bodegaId: searchParams.get("bodegaId") || null,
    });
    return Response.json(
      filas.map((fila) => ({
        productoId: fila.productoId,
        bodegaId: fila.bodegaId,
        cantidad: fila.cantidad,
        producto: fila.producto,
        bodega: fila.bodega,
        updatedAt: fila.updatedAt,
      }))
    );
  } catch (error) {
    console.error("GET /api/inventario/stock", error?.message);
    return Response.json({ error: "No se pudo obtener el stock." }, { status: 500 });
  }
}
