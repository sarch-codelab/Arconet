import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/dal';
import { deleteSession } from '@/lib/session';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  try {
    const sessions = await prisma.sesionUsuario.findMany({
      where: { usuarioId: guard.session.sub, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, sessionId: true, userAgent: true, createdAt: true, expiresAt: true },
    });
    return Response.json(sessions.map((session) => ({ ...session, current: session.sessionId === guard.session.sessionId })), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/perfil/sesiones", error?.message);
    return Response.json({ error: "No se pudieron cargar las sesiones." }, { status: 503 });
  }
}

export async function DELETE(request) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Solicitud inválida." }, { status: 400 }); }
  try {
    if (body?.allOther === true) {
      const result = await prisma.sesionUsuario.updateMany({
        where: { usuarioId: guard.session.sub, sessionId: { not: guard.session.sessionId }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return Response.json({ ok: true, revoked: result.count });
    }
    if (typeof body?.sessionId !== "string" || !body.sessionId || body.sessionId === guard.session.sessionId) {
      return Response.json({ error: "Selecciona otra sesión para cerrarla." }, { status: 400 });
    }
    const result = await prisma.sesionUsuario.updateMany({
      where: { usuarioId: guard.session.sub, sessionId: body.sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!result.count) return Response.json({ error: "La sesión ya fue cerrada o no pertenece a esta cuenta." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/perfil/sesiones", error?.message);
    return Response.json({ error: "No se pudo cerrar la sesión." }, { status: 503 });
  }
}
