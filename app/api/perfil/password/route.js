import { prisma } from "../../../../lib/prisma";
import { requireSession } from "../../../../lib/dal";
import { hashPassword, verifyPassword } from "../../../../lib/auth";
import { writeLog } from "../../../../lib/logs";
import { validarPassword } from "../../../../lib/seguridad";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const currentPassword = typeof body?.actual === "string" ? body.actual : "";
  const newPassword = typeof body?.nueva === "string" ? body.nueva : "";
  const policy = validarPassword(newPassword, { contexto: guard.session.correo });
  if (!policy.ok) return Response.json({ error: policy.error }, { status: 400 });
  try {
    const account = await prisma.usuario.findUnique({ where: { correo: guard.session.correo }, select: { id: true, correo: true, passwordHash: true } });
    if (!account || !verifyPassword(currentPassword, account.passwordHash)) return Response.json({ error: "La contraseña actual no es correcta." }, { status: 401 });
    if (verifyPassword(newPassword, account.passwordHash)) return Response.json({ error: "La nueva contraseña debe ser diferente." }, { status: 400 });
    await prisma.usuario.update({ where: { id: account.id }, data: { passwordHash: hashPassword(newPassword) } });
    await prisma.sesionUsuario.updateMany({ where: { usuarioId: account.id, sessionId: { not: guard.session.sessionId }, revokedAt: null }, data: { revokedAt: new Date() } });
    await writeLog("auth", "Actualizó la contraseña de la cuenta", { actor: account.correo, ruta: "/api/perfil/password" });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/perfil/password", error?.message);
    return Response.json({ error: "No se pudo actualizar la contraseña." }, { status: 503 });
  }
}
