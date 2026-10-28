import { prisma } from "@/lib/prisma";
import { requireClientSession } from "@/lib/portal-cliente";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Notificaciones del portal de clientes. El destinatario es el propio
 * clienteId (no el correo, para que los avisos no dependan de cambios
 * de correo). Incluye avisos de soporte y eventos de órdenes.
 */
export async function GET() {
  const { session, response } = await requireClientSession();
  if (response) return response;
  try {
    const items = await prisma.notificacion.findMany({
      where: { recipient: `cliente:${session.clienteId}` },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return Response.json(items.map((item) => ({ ...item, read: Boolean(item.readAt) })));
  } catch (error) {
    console.error("GET /api/cliente-portal/notificaciones", error?.message);
    return Response.json({ error: "No se pudieron cargar las notificaciones." }, { status: 503 });
  }
}

/**
 * PATCH { id? , all? } — marca como leídas las notificaciones propias.
 */
export async function PATCH(request) {
  const { session, response } = await requireClientSession();
  if (response) return response;
  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const where = { recipient: `cliente:${session.clienteId}` };
  if (body?.all !== true) {
    if (typeof body?.id !== "string" || !body.id) {
      return Response.json({ error: "Indica la notificación que quieres marcar como leída." }, { status: 400 });
    }
    where.id = body.id;
  }
  try {
    await prisma.notificacion.updateMany({ where, data: { readAt: new Date() } });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/cliente-portal/notificaciones", error?.message);
    return Response.json({ error: "No se pudieron actualizar las notificaciones." }, { status: 503 });
  }
}
