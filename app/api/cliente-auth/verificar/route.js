import { prisma } from '@/lib/prisma';
import { getClientSession } from '@/lib/client-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { consumirTokenAcceso } from '@/lib/tokens';
import { marcarCuentaVerificada, normalizarCorreo } from '@/lib/cuenta';
import { writeLog } from '@/lib/logs';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Confirma el correo del cliente con el código enviado. */
export async function POST(request) {
  const session = await getClientSession();
  if (!session?.clienteId) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  const ip = getClientIp(request);
  if (checkRateLimit(`verificar-ip:${ip}`, { max: 20, windowMs: 15 * 60_000 }).limited) {
    return Response.json({ error: "Demasiados intentos. Intenta más tarde." }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const codigo = String(body?.codigo ?? "").replace(/\D/g, "").slice(0, 6);
  if (codigo.length !== 6) {
    return Response.json({ error: "El código tiene 6 dígitos." }, { status: 400 });
  }

  try {
    const cuenta = await prisma.clienteCuenta.findUnique({
      where: { clienteId: session.clienteId },
      select: {
        id: true,
        correo: true,
        verificadoAt: true,
        cliente: { select: { nombre: true, contacto: true } },
      },
    });
    if (!cuenta) {
      return Response.json({ error: "No se encontró la cuenta." }, { status: 404 });
    }
    if (cuenta.verificadoAt) {
      return Response.json({ ok: true, verificado: true });
    }

    const correo = normalizarCorreo(cuenta.correo);
    try {
      await consumirTokenAcceso({ correo, tipo: "verificacion", codigo });
    } catch {
      await writeLog("auth", `Código de verificación inválido: ${correo}`, {
        nivel: "warn",
        actor: correo,
        ruta: "/api/cliente-auth/verificar",
      });
      return Response.json({ error: "El código no es válido o ya expiró." }, { status: 400 });
    }

    const objetivo = {
      tipo: "cliente",
      id: cuenta.id,
      nombre: cuenta.cliente?.contacto || cuenta.cliente?.nombre || "cliente",
      correo,
      verificadoAt: cuenta.verificadoAt,
    };
    await marcarCuentaVerificada(objetivo);
    await writeLog("auth", `Correo verificado: ${correo}`, {
      actor: correo,
      ruta: "/api/cliente-auth/verificar",
    });

    return Response.json({ ok: true, verificado: true });
  } catch (error) {
    console.error("POST /api/cliente-auth/verificar", error?.message);
    return Response.json({ error: "No se pudo verificar el correo. Intenta más tarde." }, { status: 503 });
  }
}
