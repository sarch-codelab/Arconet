import { requirePermission, getPermisos } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { serializeLog } from "@/lib/logs";
import { inventoryLogScope } from "@/lib/inventory-access";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request) {
  const guard = await requirePermission("inventario:read");
  if (guard.response) return guard.response;
  const permisos = await getPermisos(guard.session),
    params = new URL(request.url).searchParams;
  const nivel = ["info", "warn", "error"].includes(params.get("nivel"))
    ? params.get("nivel")
    : null;
  try {
    const [logs, movements] = await Promise.all([
      prisma.log.findMany({
        where: {
          AND: [inventoryLogScope(permisos), ...(nivel ? [{ nivel }] : [])],
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      nivel && nivel !== "info"
        ? []
        : prisma.movimientoKardex.findMany({
            orderBy: { fecha: "desc" },
            take: 200,
            select: {
              id: true,
              fecha: true,
              tipo: true,
              cantidad: true,
              saldoAnterior: true,
              saldoDespues: true,
              actor: true,
              producto: { select: { nombre: true, sku: true } },
              bodega: { select: { nombre: true } },
            },
          }),
    ]);
    const operational = movements.map((row) => ({
      id: `kardex-${row.id}`,
      nivel: "info",
      categoria: "panel",
      mensaje: `${row.tipo} · ${row.producto?.sku || ""} ${row.producto?.nombre || ""} · ${row.cantidad}`,
      detalle: JSON.stringify({
        bodega: row.bodega?.nombre,
        saldoAnterior: row.saldoAnterior,
        saldoDespues: row.saldoDespues,
      }),
      actor: row.actor,
      ruta: "/api/inventario/kardex",
      createdAt: row.fecha,
    }));
    return Response.json(
      [...logs, ...operational]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 200)
        .map(serializeLog),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json(
      { error: "No se pudieron cargar los registros del área." },
      { status: 503 },
    );
  }
}
