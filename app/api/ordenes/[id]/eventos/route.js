import { prisma } from '@/lib/prisma";
import { requirePermission } from '@/lib/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Historial auditable de la orden: estados, pagos, entregas y ediciones. */
export async function GET(_request, { params }) {
  const guard = await requirePermission("ordenes:read");
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const orden = await prisma.orden.findUnique({ where: { id }, select: { id: true } });
    if (!orden) return Response.json({ error: "Orden no encontrada." }, { status: 404 });
    const eventos = await prisma.ordenEvento.findMany({
      where: { ordenId: id },
      orderBy: { fecha: "desc" },
      take: 300,
    });
    return Response.json(eventos);
  } catch (error) {
    console.error("GET /api/ordenes/[id]/eventos", error?.message);
    return Response.json({ error: "No se pudo obtener el historial." }, { status: 500 });
  }
}
