import { prisma } from "../../../lib/prisma";
import { newWorkerId, parseTrabajador } from "../../../lib/trabajadores";
import { toTrabajador } from "../../../lib/serialize";
import { requireSession } from "../../../lib/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { searchParams } = new URL(request.url);
  const sucursal = searchParams.get("sucursal");
  const rol = searchParams.get("rol");
  const estado = searchParams.get("estado");

  const where = {};
  if (sucursal) where.sucursalId = sucursal;
  if (rol) where.rol = rol;
  if (estado) where.estado = estado;

  const trabajadores = await prisma.trabajador.findMany({
    where,
    orderBy: { nombre: "asc" },
  });
  return Response.json(trabajadores.map(toTrabajador));
}

export async function POST(request) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parseTrabajador(body);
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  try {
    const trabajador = await prisma.trabajador.create({
      data: { id: newWorkerId(), ...data },
    });
    return Response.json(toTrabajador(trabajador), { status: 201 });
  } catch (error) {
    if (error?.code === "P2002") {
      return Response.json({ error: "Ya existe un trabajador con ese correo." }, { status: 409 });
    }
    console.error("POST /api/trabajadores", error);
    return Response.json({ error: "No se pudo crear el trabajador." }, { status: 500 });
  }
}
