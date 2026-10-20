import { prisma } from "../../../../lib/prisma";
import { verifyPassword } from "../../../../lib/auth";
import { createSession } from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) {
    return Response.json({ error: "Correo y contraseña son obligatorios." }, { status: 400 });
  }

  const usuario = await prisma.usuario.findUnique({ where: { correo: email } });
  if (!usuario || !usuario.activo || !verifyPassword(password, usuario.passwordHash)) {
    return Response.json({ error: "Credenciales inválidas." }, { status: 401 });
  }

  await createSession({
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    sucursal: usuario.sucursalId ?? "",
  });

  return Response.json({
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    sucursal: usuario.sucursalId ?? "",
  });
}
