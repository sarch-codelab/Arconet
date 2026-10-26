import { prisma } from "../../../../lib/prisma";
import { getClientSession } from "../../../../lib/client-session";
import { hashPassword, verifyPassword } from "../../../../lib/auth";
import { checkRateLimit, getClientIp } from "../../../../lib/rate-limit";
import { validarPassword } from "../../../../lib/seguridad";
import { normalizarCorreo } from "../../../../lib/cuenta";
import { writeLog } from "../../../../lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cambio de contraseña con la contraseña actual (cliente autenticado). */
export async function POST(request) {
  const session = await getClientSession();
  if (!session?.clienteId) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  const ip = getClientIp(request);
  if (checkRateLimit(`password-cliente:${ip}`, { max: 10, windowMs: 15 * 60_000 }).limited) {
    return Response.json({ error: "Demasiados intentos. Intenta más tarde." }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const actual = typeof body?.actual === "string" ? body.actual.slice(0, 128) : "";
  const nueva = typeof body?.nueva === "string" ? body.nueva : "";
  if (!actual) {
    return Response.json({ error: "Ingresa tu contraseña actual." }, { status: 400 });
  }
  const policy = validarPassword(nueva, { contexto: normalizarCorreo(session.correo) });
  if (!policy.ok) {
    return Response.json({ error: policy.error }, { status: 400 });
  }

  try {
    const cuenta = await prisma.clienteCuenta.findUnique({
      where: { clienteId: session.clienteId },
      select: { id: true, correo: true, passwordHash: true, activo: true },
    });
    if (!cuenta?.activo) {
      return Response.json({ error: "La cuenta está desactivada." }, { status: 403 });
    }
    if (!verifyPassword(actual, cuenta.passwordHash)) {
      await writeLog("auth", `Cambio de contraseña rechazado: ${cuenta.correo}`, {
        nivel: "warn",
        actor: cuenta.correo,
        ruta: "/api/cliente-auth/password",
      });
      return Response.json({ error: "La contraseña actual no es correcta." }, { status: 401 });
    }
    if (verifyPassword(nueva, cuenta.passwordHash)) {
      return Response.json({ error: "La nueva contraseña debe ser diferente a la actual." }, { status: 400 });
    }

    await prisma.clienteCuenta.update({
      where: { id: cuenta.id },
      data: { passwordHash: hashPassword(nueva) },
    });
    await writeLog("auth", `Contraseña actualizada: ${cuenta.correo}`, {
      actor: cuenta.correo,
      ruta: "/api/cliente-auth/password",
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("POST /api/cliente-auth/password", error?.message);
    return Response.json({ error: "No se pudo actualizar la contraseña. Intenta más tarde." }, { status: 503 });
  }
}
