import { checkRateLimit, getClientIp } from '@/lib/rate-limit";
import { writeLog } from '@/lib/logs";
import { validarPassword } from '@/lib/seguridad";
import { consumirTokenAcceso } from '@/lib/tokens";
import { deleteClientSession, getClientSession } from '@/lib/client-session";
import {
  buscarCuentaPorCorreo,
  cambiarPasswordCuenta,
  normalizarCorreo,
} from '@/lib/cuenta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODIGO_INVALIDO = "El código no es válido o ya expiró. Pide uno nuevo.";

/** Canjea el código de recuperación y guarda la nueva contraseña. */
export async function POST(request) {
  const ip = getClientIp(request);
  const ipLimit = checkRateLimit(`restablecer-ip:${ip}`, { max: 20, windowMs: 15 * 60_000 });
  if (ipLimit.limited) {
    return Response.json({ error: "Demasiados intentos. Intenta más tarde." }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const correo = normalizarCorreo(body?.correo);
  const codigo = String(body?.codigo ?? "").replace(/\D/g, "").slice(0, 6);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return Response.json({ error: "Ingresa un correo electrónico válido." }, { status: 400 });
  }
  if (codigo.length !== 6) {
    return Response.json({ error: "El código tiene 6 dígitos." }, { status: 400 });
  }
  const policy = validarPassword(password, { contexto: correo });
  if (!policy.ok) {
    return Response.json({ error: policy.error }, { status: 400 });
  }

  const accountLimit = checkRateLimit(`restablecer-cuenta:${correo}`, { max: 10, windowMs: 15 * 60_000 });
  if (accountLimit.limited) {
    return Response.json({ error: "Demasiados intentos. Intenta más tarde." }, { status: 429 });
  }

  try {
    const cuenta = await buscarCuentaPorCorreo(correo);
    if (!cuenta) {
      return Response.json({ error: CODIGO_INVALIDO }, { status: 400 });
    }

    try {
      await consumirTokenAcceso({ correo: cuenta.correo, tipo: "recuperacion", codigo });
    } catch {
      await writeLog("auth", `Código de recuperación inválido para ${cuenta.correo}`, {
        nivel: "warn",
        actor: cuenta.correo,
        ruta: "/api/cuenta/restablecer",
      });
      return Response.json({ error: CODIGO_INVALIDO }, { status: 400 });
    }

    await cambiarPasswordCuenta(cuenta, password);

    // Si el navegador tenía abierta la sesión de este mismo cliente, se cierra:
    // cualquier sesión previa deja de ser válida.
    try {
      const clientSession = await getClientSession();
      if (clientSession?.correo && normalizarCorreo(clientSession.correo) === cuenta.correo) {
        await deleteClientSession();
      }
    } catch {}

    await writeLog("auth", `Contraseña restablecida: ${cuenta.correo}`, {
      actor: cuenta.correo,
      ruta: "/api/cuenta/restablecer",
      detalle: { tipo: cuenta.tipo },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("POST /api/cuenta/restablecer", error?.message);
    return Response.json({ error: "No se pudo restablecer la contraseña. Intenta más tarde." }, { status: 503 });
  }
}
