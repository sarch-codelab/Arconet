import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/dal';
import { canAccessSolicitud } from '@/lib/solicitudes-internas';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Historial de la orden interna: estados, responsables, SLA, adjuntos. */
export async function GET(_request, { params }) {
  const guard = await requirePermission("solicitudes:read");
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const current = await prisma.solicitudInterna.findUnique({ where: { id } });
    if (!current) return Response.json({ error: "No se encontró la orden." }, { status: 404 });
    const area = await prisma.areaSolicitud.findUnique({ where: { slug: current.area } });
    if (!canAccessSolicitud(guard.session, current, area)) {
      return Response.json({ error: "No tienes acceso a esta orden." }, { status: 403 });
    }
    const eventos = await prisma.solicitudEvento.findMany({
      where: { solicitudId: id },
      orderBy: { fecha: "desc" },
      take: 300,
    });
    return Response.json(eventos);
  } catch (error) {
    console.error("GET /api/solicitudes/[id]/eventos", error?.message);
    return Response.json({ error: "No se pudo obtener el historial." }, { status: 500 });
  }
}
