import { prisma } from '@/lib/prisma";
import { verifyPassword } from '@/lib/auth";
import { createClientSession } from '@/lib/client-session";
import { writeLog } from '@/lib/logs";
import { checkRateLimit, getClientIp } from '@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DUMMY_HASH = "0000000000000000000000000000000000000000000000000000000000000000:00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const correo = typeof body?.correo === "string" ? body.correo.trim().toLowerCase().slice(0, 254) : "";
  const password = typeof body?.password === "string" ? body.password.slice(0, 128) : "";
  const ip = getClientIp(request);
  const ipLimit = checkRateLimit(`client-login-ip:${ip}`, { max: 30, windowMs: 15 * 60_000 });
  const accountLimit = checkRateLimit(`client-login-account:${correo || "anon"}`, { max: 10, windowMs: 15 * 60_000 });
  if (ipLimit.limited || accountLimit.limited) {
    return Response.json({ error: "Demasiados intentos. Intenta más tarde." }, { status: 429 });
  }
  if (!correo || !password) {
    return Response.json({ error: "Correo y contraseña son obligatorios." }, { status: 400 });
  }

  try {
    const account = await prisma.clienteCuenta.findUnique({
      where: { correo },
      select: {
        clienteId: true,
        passwordHash: true,
        activo: true,
        cliente: {
          select: {
            nombre: true,
            contacto: true,
            correo: true,
            telefono: true,
            rtn: true,
            ciudad: true,
            direccion: true,
            estado: true,
          },
        },
      },
    });
    let passwordMatches = false;
    try {
      passwordMatches = verifyPassword(password, account?.passwordHash || DUMMY_HASH);
    } catch {}
    if (!account || !account.activo || account.cliente.estado === "inactivo" || !passwordMatches) {
      await writeLog("auth", `Intento de acceso de cliente fallido: ${correo}`, {
        nivel: "warn",
        actor: correo,
        ruta: "/api/cliente-auth/login",
      });
      return Response.json({ error: "Credenciales inválidas." }, { status: 401 });
    }

    const session = {
      id: account.clienteId,
      clienteId: account.clienteId,
      nombre: account.cliente.contacto || account.cliente.nombre,
      empresa: account.cliente.nombre,
      correo: account.cliente.correo,
      telefono: account.cliente.telefono || "",
      rtn: account.cliente.rtn || "",
      ciudad: account.cliente.ciudad || "",
      direccion: account.cliente.direccion || "",
    };
    await createClientSession(session, body?.recordarme !== false);
    await writeLog("auth", `Acceso de cliente: ${correo}`, {
      actor: correo,
      ruta: "/api/cliente-auth/login",
    });
    return Response.json(session);
  } catch (error) {
    console.error("POST /api/cliente-auth/login", error?.message);
    return Response.json({ error: "Servicio no disponible. Intenta más tarde." }, { status: 503 });
  }
}
