import { randomUUID } from "node:crypto";
import { prisma } from "../../../../lib/prisma";
import { hashPassword } from "../../../../lib/auth";
import { createClientSession } from "../../../../lib/client-session";
import { checkRateLimit, getClientIp } from "../../../../lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`client-register:${ip}`, { max: 5, windowMs: 15 * 60_000 });
  if (limit.limited) {
    return Response.json({ error: "Demasiados intentos. Intenta más tarde." }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const nombre = typeof body?.nombre === "string" ? body.nombre.trim().slice(0, 160) : "";
  const empresa = typeof body?.empresa === "string" ? body.empresa.trim().slice(0, 160) : "";
  const correo = typeof body?.correo === "string" ? body.correo.trim().toLowerCase().slice(0, 254) : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const telefono = typeof body?.telefono === "string" ? body.telefono.trim().slice(0, 40) : "";

  if (!nombre || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return Response.json({ error: "Ingresa tu nombre y un correo válido." }, { status: 400 });
  }
  if (password.length < 12 || password.length > 128) {
    return Response.json({ error: "La contraseña debe tener entre 12 y 128 caracteres." }, { status: 400 });
  }
  if (body?.aceptaTerminos !== true) {
    return Response.json({ error: "Acepta los términos para crear tu cuenta." }, { status: 400 });
  }

  try {
    const passwordHash = hashPassword(password);
    const cliente = await prisma.$transaction(async (tx) => {
      const existing = await tx.$queryRaw`
        SELECT "id" FROM "Cliente"
        WHERE lower("correo") = ${correo}
        LIMIT 1
      `;
      if (existing.length) {
        const error = new Error("El correo ya está asociado a un registro comercial. Contacta a Arconet para habilitar el acceso.");
        error.status = 409;
        throw error;
      }

      const created = await tx.cliente.create({
        data: {
          id: `c-${randomUUID()}`,
          nombre: empresa || nombre,
          contacto: nombre,
          correo,
          telefono: telefono || null,
          estado: "prospecto",
        },
      });
      await tx.clienteCuenta.create({
        data: {
          id: `cc-${randomUUID()}`,
          clienteId: created.id,
          correo,
          passwordHash,
        },
      });
      return created;
    });

    const session = {
      id: cliente.id,
      clienteId: cliente.id,
      nombre: cliente.contacto || cliente.nombre,
      empresa: cliente.nombre,
      correo: cliente.correo,
      telefono: cliente.telefono || "",
      rtn: cliente.rtn || "",
      ciudad: cliente.ciudad || "",
      direccion: cliente.direccion || "",
    };
    await createClientSession(session, body?.recordarme !== false);
    return Response.json(session, { status: 201 });
  } catch (error) {
    if (error?.status === 409 || error?.code === "P2002" || error?.code === "23505") {
      return Response.json(
        { error: error?.status === 409 ? error.message : "Ya existe una cuenta con ese correo." },
        { status: 409 },
      );
    }
    console.error("POST /api/cliente-auth/registro", error?.message);
    return Response.json({ error: "No se pudo crear la cuenta. Intenta más tarde." }, { status: 503 });
  }
}
