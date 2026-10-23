import { prisma } from "../../../../lib/prisma";
import { requirePermission } from "../../../../lib/dal";
import { canAccessSolicitud, canSeeAllSolicitudes, createSolicitudNotifications, ESTADOS_SOLICITUD, rolesForArea } from "../../../../lib/solicitudes-internas";
import { writeLog } from "../../../../lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const guard = await requirePermission("solicitudes:write");
  if (guard.response) return guard.response;
  const { id } = await params;
  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const estado = typeof body?.estado === "string" ? body.estado : "";
  if (!ESTADOS_SOLICITUD.includes(estado)) return Response.json({ error: "El estado indicado no es válido." }, { status: 400 });
  try {
    const current = await prisma.solicitudInterna.findUnique({ where: { id }, include: { comentarios: { orderBy: { createdAt: "asc" } } } });
    if (!current) return Response.json({ error: "No se encontró la orden." }, { status: 404 });
    const session = guard.session;
    const area = await prisma.areaSolicitud.findUnique({ where: { slug: current.area } });
    if (!canAccessSolicitud(session, current, area)) return Response.json({ error: "No tienes acceso a esta orden." }, { status: 403 });
    const isCoordinator = canSeeAllSolicitudes(session);
    const canWorkArea = rolesForArea(area).includes(session.rol);
    if (!isCoordinator && !canWorkArea) return Response.json({ error: "Solo el área asignada puede cambiar el estado." }, { status: 403 });
    const transitions = {
      pendiente: ["en_revision"],
      en_revision: ["aprobada", "rechazada"],
      aprobada: ["en_proceso"],
      rechazada: ["pendiente"],
      en_proceso: ["completada"],
      completada: [],
    };
    if (!transitions[current.estado]?.includes(estado)) return Response.json({ error: "Ese cambio de estado no está permitido." }, { status: 409 });
    if (current.responsableCorreo && current.responsableCorreo.toLowerCase() !== session.correo.toLowerCase() && current.estado !== "pendiente" && !isCoordinator) {
      return Response.json({ error: `La orden ya está siendo atendida por ${current.responsableCorreo}.` }, { status: 409 });
    }
    const updated = await prisma.solicitudInterna.update({
      where: { id },
      data: {
        estado,
        ...(estado === "en_revision" && !current.responsableCorreo ? { responsableCorreo: session.correo } : {}),
      },
      include: { comentarios: { orderBy: { createdAt: "asc" } } },
    });
    await createSolicitudNotifications(prisma, {
      solicitudId: id,
      areaSlugValue: current.area,
      actorEmail: session.correo,
      extraRecipients: [current.solicitanteCorreo],
      title: `Orden ${id}: ${estado.replaceAll("_", " ")}`,
      message: `${session.nombre || session.correo} actualizó “${current.titulo}”.`,
    });
    await writeLog("panel", `Orden interna ${id}: ${estado}`, { actor: session.correo, ruta: `/api/solicitudes/${id}` });
    return Response.json(updated);
  } catch (error) {
    console.error("PATCH /api/solicitudes/[id]", error?.message);
    return Response.json({ error: "No se pudo actualizar la orden." }, { status: 503 });
  }
}
