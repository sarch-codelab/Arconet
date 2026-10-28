import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/dal';
import { canAccessSolicitud, createSolicitudNotifications } from '@/lib/solicitudes-internas';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const guard = await requirePermission("solicitudes:write");
  if (guard.response) return guard.response;
  const { id } = await params;
  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const mensaje = typeof body?.mensaje === "string" ? body.mensaje.trim().slice(0, 3000) : "";
  if (!mensaje) return Response.json({ error: "Escribe un comentario antes de enviarlo." }, { status: 400 });
  try {
    const current = await prisma.solicitudInterna.findUnique({ where: { id } });
    if (!current) return Response.json({ error: "No se encontró la orden." }, { status: 404 });
    const session = guard.session;
    const area = await prisma.areaSolicitud.findUnique({ where: { slug: current.area } });
    if (!canAccessSolicitud(session, current, area)) return Response.json({ error: "No tienes acceso a esta orden." }, { status: 403 });
    const comment = await prisma.$transaction(async (tx) => {
      const saved = await tx.comentarioSolicitud.create({
        data: {
          solicitudId: id,
          autorCorreo: session.correo,
          autorNombre: session.nombre || session.correo,
          autorRol: session.rol,
          mensaje,
        },
      });
      await tx.solicitudInterna.update({ where: { id }, data: { updatedAt: new Date() } });
      return saved;
    });
    await createSolicitudNotifications(prisma, {
      solicitudId: id,
      areaSlugValue: current.area,
      actorEmail: session.correo,
      extraRecipients: [current.solicitanteCorreo, current.responsableCorreo].filter(Boolean),
      title: `Nuevo comentario en ${id}`,
      message: `${session.nombre || session.correo}: ${mensaje.slice(0, 120)}`,
    });
    return Response.json(comment, { status: 201 });
  } catch (error) {
    console.error("POST /api/solicitudes/[id]/comentarios", error?.message);
    return Response.json({ error: "No se pudo guardar el comentario." }, { status: 503 });
  }
}
