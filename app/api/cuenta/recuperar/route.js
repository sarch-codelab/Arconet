import { checkRateLimit, getClientIp } from "../../../../lib/rate-limit";
import { writeLog } from "../../../../lib/logs";
import { buscarCuentaPorCorreo, enviarCodigoRecuperacion, normalizarCorreo } from "../../../../lib/cuenta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESPUESTA_GENERICA =
  "Si el correo pertenece a una cuenta Arconet, enviamos un código para restablecer la contraseña. Revisa también tu carpeta de spam.";

/**
 * Solicita un código de recuperación. La respuesta es siempre la misma exista
 * o no la cuenta, para no permitir enumerar correos registrados.
 */
export async function POST(request) {
  const ip = getClientIp(request);
  const ipLimit = checkRateLimit(`recuperar-ip:${ip}`, { max: 10, windowMs: 15 * 60_000 });
  if (ipLimit.limited) {
    return Response.json({ error: "Demasiadas solicitudes. Intenta más tarde." }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const correo = normalizarCorreo(body?.correo);
  if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return Response.json({ error: "Ingresa un correo electrónico válido." }, { status: 400 });
  }

  const accountLimit = checkRateLimit(`recuperar-cuenta:${correo}`, { max: 3, windowMs: 15 * 60_000 });
  if (accountLimit.limited) {
    return Response.json({ error: "Pediste varios códigos seguidos. Espera unos minutos e intenta de nuevo." }, { status: 429 });
  }

  try {
    const cuenta = await buscarCuentaPorCorreo(correo);
    if (cuenta) {
      try {
        await enviarCodigoRecuperacion(cuenta, { ip });
      } catch (error) {
        // El envío puede fallar (SMTP caído). No se filtra al solicitante.
        console.error("POST /api/cuenta/recuperar envío", error?.message);
        await writeLog("auth", `No se pudo enviar el código de recuperación a ${cuenta.correo}`, {
          nivel: "error",
          actor: cuenta.correo,
          ruta: "/api/cuenta/recuperar",
        });
      }
      await writeLog("auth", `Solicitud de recuperación de contraseña: ${cuenta.correo}`, {
        nivel: "warn",
        actor: cuenta.correo,
        ruta: "/api/cuenta/recuperar",
        detalle: { tipo: cuenta.tipo, ip },
      });
    }
    return Response.json({ ok: true, mensaje: RESPUESTA_GENERICA });
  } catch (error) {
    console.error("POST /api/cuenta/recuperar", error?.message);
    return Response.json({ error: "Servicio no disponible. Intenta más tarde." }, { status: 503 });
  }
}
