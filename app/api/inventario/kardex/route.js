import { requirePermission } from '@/lib/dal";
import { prisma } from '@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kardex: historial de movimientos con filtros (producto, bodega, tipo, fechas). */
export async function GET(request) {
  const guard = await requirePermission("inventario:read");
  if (guard.response) return guard.response;
  const { searchParams } = new URL(request.url);
  const take = Math.min(Math.max(Number(searchParams.get("take")) || 100, 1), 500);
  const skip = Math.max(Number(searchParams.get("skip")) || 0, 0);

  const where = {};
  if (searchParams.get("productoId")) where.productoId = searchParams.get("productoId");
  if (searchParams.get("bodegaId")) where.bodegaId = searchParams.get("bodegaId");
  if (searchParams.get("tipo")) where.tipo = searchParams.get("tipo");
  if (searchParams.get("referencia")) where.referencia = searchParams.get("referencia");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha.gte = new Date(desde);
    if (hasta) where.fecha.lte = new Date(hasta);
  }

  try {
    const [movimientos, total] = await Promise.all([
      prisma.movimientoKardex.findMany({
        where,
        orderBy: { fecha: "desc" },
        take,
        skip,
        include: {
          producto: { select: { id: true, nombre: true, sku: true, unidad: true, costo: true } },
          bodega: { select: { id: true, nombre: true, codigo: true } },
        },
      }),
      prisma.movimientoKardex.count({ where }),
    ]);
    return Response.json({
      total,
      take,
      skip,
      movimientos: movimientos.map((m) => ({
        id: m.id,
        fecha: m.fecha,
        tipo: m.tipo,
        producto: m.producto,
        bodega: m.bodega,
        bodegaDestinoId: m.bodegaDestinoId,
        cantidad: m.cantidad,
        saldoAnterior: m.saldoAnterior,
        saldoDespues: m.saldoDespues,
        costoUnitario: m.costoUnitario,
        referencia: m.referencia,
        motivo: m.motivo,
        actor: m.actor,
      })),
    });
  } catch (error) {
    console.error("GET /api/inventario/kardex", error?.message);
    return Response.json({ error: "No se pudo obtener el kardex." }, { status: 500 });
  }
}
