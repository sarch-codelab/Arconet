import { randomUUID } from "node:crypto";

export const AREAS_SOLICITUD = {
  bodega: { label: "Bodega", roles: ["bodega", "gerente", "administrador"] },
  mantenimiento: { label: "Mantenimiento", roles: ["mantenimiento", "tecnico", "gerente", "administrador"] },
  atencion: { label: "Atención al cliente", roles: ["ventas", "gerente", "administrador"] },
};

export const ESTADOS_SOLICITUD = ["pendiente", "en_revision", "aprobada", "rechazada", "en_proceso", "completada"];
export const PRIORIDADES_SOLICITUD = ["baja", "normal", "alta", "urgente"];

export function newSolicitudId() {
  return `sol-${randomUUID()}`;
}

export function rolesForArea(area) {
  return AREAS_SOLICITUD[area]?.roles ?? [];
}

export function canSeeAllSolicitudes(session) {
  return ["administrador", "gerente"].includes(session?.rol);
}

export function canAccessSolicitud(session, solicitud) {
  if (!session?.correo || !solicitud) return false;
  if (canSeeAllSolicitudes(session)) return true;
  if (solicitud.solicitanteCorreo.toLowerCase() === session.correo.toLowerCase()) return true;
  if (solicitud.responsableCorreo?.toLowerCase() === session.correo.toLowerCase()) return true;
  return rolesForArea(solicitud.area).includes(session.rol);
}

export async function createSolicitudNotifications(prisma, { solicitudId, area, actorEmail, title, message, extraRecipients = [] }) {
  try {
    const roles = [...new Set([...rolesForArea(area), "gerente", "administrador"] )];
    const users = await prisma.usuario.findMany({
      where: { activo: true, rol: { in: roles } },
      select: { correo: true },
    });
    const actor = actorEmail.toLowerCase();
    const recipients = [...new Set([...users.map((user) => user.correo.toLowerCase()), ...extraRecipients.map((email) => email.toLowerCase())])]
      .filter((email) => email && email !== actor);
    if (!recipients.length) return true;
    await prisma.notificacion.createMany({
      data: recipients.map((recipient) => ({
        recipient,
        title,
        message,
        type: "solicitud",
        solicitudId,
      })),
    });
    return true;
  } catch (error) {
    // El cambio de orden ya fue guardado; un fallo de la campana no debe
    // hacer creer al usuario que la orden o el comentario no se registró.
    console.error("No se pudieron generar notificaciones de orden", error?.message);
    return false;
  }
}
