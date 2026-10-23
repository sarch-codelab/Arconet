import { randomUUID } from "node:crypto";

export const ESTADOS_SOLICITUD = ["pendiente", "en_revision", "aprobada", "rechazada", "en_proceso", "completada"];
export const PRIORIDADES_SOLICITUD = ["baja", "normal", "alta", "urgente"];

export function newSolicitudId() {
  return `sol-${randomUUID()}`;
}

export function areaSlug(nombre) {
  return String(nombre || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function rolesForArea(area) {
  return Array.isArray(area?.roles) ? area.roles : [];
}

export function canSeeAllSolicitudes(session) {
  return ["administrador", "gerente"].includes(session?.rol);
}

export function canAccessSolicitud(session, solicitud, area) {
  if (!session?.correo || !solicitud) return false;
  if (canSeeAllSolicitudes(session)) return true;
  if (solicitud.solicitanteCorreo.toLowerCase() === session.correo.toLowerCase()) return true;
  if (solicitud.responsableCorreo?.toLowerCase() === session.correo.toLowerCase()) return true;
  return rolesForArea(area).includes(session.rol);
}

export async function createSolicitudNotifications(prisma, { solicitudId, areaSlugValue, actorEmail, title, message, extraRecipients = [] }) {
  try {
    const [area, users] = await Promise.all([
      prisma.areaSolicitud.findUnique({ where: { slug: areaSlugValue }, select: { roles: true } }),
      prisma.usuario.findMany({ where: { activo: true }, select: { correo: true, rol: true } }),
    ]);
    const roles = new Set([...rolesForArea(area), "gerente", "administrador"]);
    const actor = actorEmail.toLowerCase();
    const recipients = [...new Set([
      ...users.filter((user) => roles.has(user.rol)).map((user) => user.correo.toLowerCase()),
      ...extraRecipients.map((email) => email.toLowerCase()),
    ])].filter((email) => email && email !== actor);
    if (!recipients.length) return true;
    await prisma.notificacion.createMany({
      data: recipients.map((recipient) => ({ recipient, title, message, type: "solicitud", solicitudId })),
    });
    return true;
  } catch (error) {
    console.error("No se pudieron generar notificaciones de orden", error?.message);
    return false;
  }
}
