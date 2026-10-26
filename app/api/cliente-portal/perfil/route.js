import { prisma } from "../../../../lib/prisma";
import { requireClientSession } from "../../../../lib/portal-cliente";
import { writeLog } from "../../../../lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAMPOS = ["contacto", "telefono", "ciudad", "direccion"];

function cleanText(value, max) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.slice(0, max);
}

/**
 * PATCH — el cliente edita sus propios datos de contacto.
 * No se permite cambiar nombre legal, RTN ni correo (el correo se gestiona
 * por el flujo de verificación / soporte).
 */
export async function PATCH(request) {
  const { session, response } = await requireClientSession();
  if (response) return response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const data = {};
  for (const campo of CAMPOS) {
    if (Object.prototype.hasOwnProperty.call(body, campo)) {
      const valor = cleanText(body[campo], campo === "direccion" ? 400 : 120);
      if (valor === null) return Response.json({ error: `El campo ${campo} no es válido.` }, { status: 400 });
      data[campo] = valor || null;
    }
  }
  if (!Object.keys(data).length) {
    return Response.json({ error: "No hay cambios que guardar." }, { status: 400 });
  }

  try {
    const cliente = await prisma.cliente.update({
      where: { id: session.clienteId },
      data,
      select: { nombre: true, contacto: true, correo: true, telefono: true, rtn: true, ciudad: true, direccion: true },
    });
    await writeLog("cliente-portal", `Cliente ${session.correo} actualizó su perfil`, {
      actor: session.correo,
      ruta: "/api/cliente-portal/perfil",
      detalle: { campos: Object.keys(data) },
    });
    return Response.json({
      nombre: cliente.contacto || cliente.nombre,
      empresa: cliente.nombre,
      correo: cliente.correo,
      telefono: cliente.telefono || "",
      rtn: cliente.rtn || "",
      ciudad: cliente.ciudad || "",
      direccion: cliente.direccion || "",
    });
  } catch (error) {
    console.error("PATCH /api/cliente-portal/perfil", error?.message);
    return Response.json({ error: "No se pudo guardar el perfil." }, { status: 503 });
  }
}
