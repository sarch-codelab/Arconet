import { prisma } from "../../../../lib/prisma";
import { requirePermission } from "../../../../lib/dal";
import { canAccessSolicitud, canSeeAllSolicitudes, createSolicitudNotifications, ESTADOS_SOLICITUD, fechaLimiteSLA, registrarEventoSolicitud, rolesForArea } from "../../../../lib/solicitudes-internas";
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
  const prioridad = typeof body?.prioridad === "string" ? body.prioridad : "";
  const responsableCorreo = typeof body?.responsableCorreo === "string" ? body.responsableCorreo.trim() : "";
  const soloCambioAsignacion = !estado && (prioridad || responsableCorreo);
  if (estado && !ESTADOS_SOLICITUD.includes(estado)) return Response.json({ error: "El estado indicado no es válido." }, { status: 400 });
  if (!estado && !soloCambioAsignacion) return Response.json({ error: "Indica un estado, una prioridad o un responsable." }, { status: 400 });
  try {
    const current = await prisma.solicitudInterna.findUnique({ where: { id }, include: { comentarios: { orderBy: { createdAt: "asc" } } } });
    if (!current) return Response.json({ error: "No se encontró la orden." }, { status: 404 });
    const session = guard.session;
    const area = await prisma.areaSolicitud.findUnique({ where: { slug: current.area } });
    if (!canAccessSolicitud(session, current, area)) return Response.json({ error: "No tienes acceso a esta orden." }, { status: 403 });
    const isCoordinator = canSeeAllSolicitudes(session);
    const canWorkArea = rolesForArea(area).includes(session.rol);
    if (!isCoordinator && !canWorkArea) return Response.json({ error: "Solo el área asignada puede cambiar el estado." }, { status: 403 });

    if (soloCambioAsignacion) {
      const data = {};
      if (prioridad && prioridad !== current.prioridad) {
        data.prioridad = prioridad;
        data.fechaLimite = fechaLimiteSLA(prioridad, current.createdAt);
      }
      if (responsableCorreo && responsableCorreo.toLowerCase() !== (current.responsableCorreo || "").toLowerCase()) {
        data.responsableCorreo = responsableCorreo;
      }
      if (!Object.keys(data).length) return Response.json(current);
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.solicitudInterna.update({ where: { id }, data, include: { comentarios: { orderBy: { createdAt: "asc" } }, adjuntos: { select: { id: true, nombre: true, tipo: true, tamano: true, autorCorreo: true, createdAt: true } } } });
        if (data.prioridad) {
          await registrarEventoSolicitud(tx, { solicitudId: id, tipo: "prioridad", de: current.prioridad, a: data.prioridad, actorCorreo: session.correo, actorNombre: session.nombre || session.correo });
        }
        if (data.responsableCorreo) {
          await registrarEventoSolicitud(tx, { solicitudId: id, tipo: "responsable", de: current.responsableCorreo, a: data.responsableCorreo, actorCorreo: session.correo, actorNombre: session.nombre || session.correo });
        }
        return result;
      });
      await writeLog("panel", `Orden interna ${id}: asignación/prioridad actualizada`, { actor: session.correo, ruta: `/api/solicitudes/${id}`, detalle: data });
      return Response.json(updated);
    }

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
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.solicitudInterna.update({
        where: { id },
        data: {
          estado,
          ...(estado === "en_revision" && !current.responsableCorreo ? { responsableCorreo: session.correo } : {}),
          ...(["completada", "rechazada"].includes(estado) ? { cerradaAt: new Date() } : { cerradaAt: null }),
        },
        include: {
          comentarios: { orderBy: { createdAt: "asc" } },
          adjuntos: { select: { id: true, nombre: true, tipo: true, tamano: true, autorCorreo: true, createdAt: true } },
        },
      });
      await registrarEventoSolicitud(tx, {
        solicitudId: id,
        tipo: "estado",
        de: current.estado,
        a: estado,
        actorCorreo: session.correo,
        actorNombre: session.nombre || session.correo,
      });
      return result;
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

/**
 * Elimina una orden interna con sus comentarios, adjuntos y eventos.
 *
 * Puede hacerlo quien la creó o un coordinador (administrador/gerente); las
 * órdenes ya completadas también se pueden borrar porque no bloquean
 * inventario ni facturación. Queda registrado en el log del sistema.
 */
export async function DELETE(_request, { params }) {
  const guard = await requirePermission("solicitudes:write");
  if (guard.response) return guard.response;
  const { id } = await params;

  try {
    const orden = await prisma.solicitudInterna.findUnique({
      where: { id },
      select: { id: true, titulo: true, area: true, estado: true, solicitanteCorreo: true },
    });
    if (!orden) return Response.json({ error: "No se encontró la orden." }, { status: 404 });

    const session = guard.session;
    const isOwner = orden.solicitanteCorreo?.toLowerCase() === session.correo?.toLowerCase();
    if (!isOwner && !canSeeAllSolicitudes(session)) {
      return Response.json(
        { error: "Solo quien creó la orden o un coordinador puede eliminarla." },
        { status: 403 },
      );
    }

    await prisma.solicitudInterna.delete({ where: { id } });
    await writeLog("panel", `Orden interna eliminada: ${orden.titulo} (${id})`, {
      nivel: "warn",
      actor: session.correo,
      ruta: `/api/solicitudes/${id}`,
      detalle: { estado: orden.estado, area: orden.area },
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "No se encontró la orden." }, { status: 404 });
    }
    console.error("DELETE /api/solicitudes/[id]", error?.message);
    await writeLog("db", `Error al eliminar la orden ${id}: ${error?.message}`, {
      nivel: "error",
      actor: guard.session?.correo,
      ruta: `/api/solicitudes/${id}`,
    });
    return Response.json({ error: "No se pudo eliminar la orden." }, { status: 500 });
  }
}
