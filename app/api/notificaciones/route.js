import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/dal';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  try {
    const items = await prisma.notificacion.findMany({
      where: { recipient: { equals: guard.session.correo, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return Response.json(items.map((item) => ({ ...item, read: Boolean(item.readAt) })));
  } catch (error) {
    console.error("GET /api/notificaciones", error?.message);
    return Response.json({ error: "No se pudieron cargar las notificaciones." }, { status: 503 });
  }
}

export async function PATCH(request) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const where = { recipient: { equals: guard.session.correo, mode: "insensitive" } };
  if (body?.all !== true) {
    if (typeof body?.id !== "string" || !body.id) return Response.json({ error: "Indica la notificación que quieres marcar como leída." }, { status: 400 });
    where.id = body.id;
  }
  try {
    await prisma.notificacion.updateMany({ where, data: { readAt: new Date() } });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/notificaciones", error?.message);
    return Response.json({ error: "No se pudieron actualizar las notificaciones." }, { status: 503 });
  }
}
