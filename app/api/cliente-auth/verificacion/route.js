import { prisma } from '@/lib/prisma';
import { getClientSession } from '@/lib/client-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { enviarCodigoVerificacion, normalizarCorreo } from '@/lib/cuenta';
import { writeLog } from '@/lib/logs';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reenvía el código de verificación al correo del cliente autenticado. */
export async function POST(request) {
  const session = await getClientSession();
  if (!session?.clienteId) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  const ip = getClientIp(request);
  const correo = normalizarCorreo(session.correo);
  if (!correo) {
    return Response.json({ error: "La sesión no tiene correo." }, { status: 400 });
  }
  if (checkRateLimit(`reenvio-cuenta:${correo}`, { max: 3, windowMs: 60 * 60_000 }).limited) {
    return Response.json({ error: "Ya enviamos varios códigos. Espera una hora o escríbenos." }, { status: 429 });
  }
  if (checkRateLimit(`reenvio-ip:${ip}`, { max: 10, windowMs: 60 * 60_000 }).limited) {
    return Response.json({ error: "Demasiadas solicitudes. Intenta más tarde." }, { status: 429 });
  }

  try {
    const cuenta = await prisma.clienteCuenta.findUnique({
      where: { clienteId: session.clienteId },
      select: {
        id: true,
        correo: true,
        activo: true,
        verificadoAt: true,
        cliente: { select: { nombre: true, contacto: true, estado: true } },
      },
    });
    if (!cuenta?.activo || cuenta.cliente?.estado === "inactivo") {
      return Response.json({ error: "La cuenta está desactivada." }, { status: 403 });
    }
    if (cuenta.verificadoAt) {
      return Response.json({ ok: true, yaVerificado: true });
    }

    const objetivo = {
      tipo: "cliente",
      id: cuenta.id,
      nombre: cuenta.cliente?.contacto || cuenta.cliente?.nombre || "cliente",
      correo: normalizarCorreo(cuenta.correo),
      verificadoAt: cuenta.verificadoAt,
    };

    try {
      const resultado = await enviarCodigoVerificacion(objetivo, { ip });
      await writeLog("auth", `Código de verificación enviado: ${objetivo.correo}`, {
        actor: objetivo.correo,
        ruta: "/api/cliente-auth/verificacion",
        detalle: { modo: resultado.modo },
      });
      return Response.json({ ok: true, enviado: resultado.enviado, modo: resultado.modo });
    } catch (error) {
      console.error("POST /api/cliente-auth/verificacion envío", error?.message);
      await writeLog("auth", `No se pudo enviar el código de verificación a ${objetivo.correo}`, {
        nivel: "error",
        actor: objetivo.correo,
        ruta: "/api/cliente-auth/verificacion",
      });
      return Response.json(
        { error: "No pudimos enviar el correo en este momento. Intenta más tarde." },
        { status: 503 },
      );
    }
  } catch (error) {
    console.error("POST /api/cliente-auth/verificacion", error?.message);
    return Response.json({ error: "Servicio no disponible. Intenta más tarde." }, { status: 503 });
  }
}
