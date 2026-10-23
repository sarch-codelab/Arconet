import { prisma } from "../../../lib/prisma";
import { newClienteId, parseCliente } from "../../../lib/clientes";
import { toCliente } from "../../../lib/serialize";
import { requirePermission } from "../../../lib/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const guard = await requirePermission("clientes:read");
  if (guard.response) return guard.response;
  const { searchParams } = new URL(request.url);
  const estado = searchParams.get("estado");
  const q = searchParams.get("q");
  const take = Math.min(Math.max(Number(searchParams.get("take")) || 100, 1), 500);
  const skip = Math.max(Number(searchParams.get("skip")) || 0, 0);

  const where = {};
  if (estado) where.estado = estado;
  if (q) {
    where.OR = [
      { nombre: { contains: q, mode: "insensitive" } },
      { rtn: { contains: q, mode: "insensitive" } },
      { contacto: { contains: q, mode: "insensitive" } },
    ];
  }

  try {
    const clientes = await prisma.cliente.findMany({
      where,
      orderBy: { fechaRegistro: "desc" },
      take,
      skip,
      select: {
        id: true, nombre: true, rtn: true, contacto: true, correo: true,
        telefono: true, direccion: true, ciudad: true, estado: true, foto: true,
        fechaRegistro: true,
      },
    });
    return Response.json(clientes.map(toCliente));
  } catch (error) {
    console.error("GET /api/clientes", error?.message);
    return Response.json({ error: "No se pudieron obtener los clientes." }, { status: 500 });
  }
}

export async function POST(request) {
  const guard = await requirePermission("clientes:write");
  if (guard.response) return guard.response;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parseCliente(body);
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  try {
    const cliente = await prisma.cliente.create({
      data: { id: newClienteId(), ...data },
    });
    return Response.json(toCliente(cliente), { status: 201 });
  } catch (error) {
    console.error("POST /api/clientes", error);
    return Response.json({ error: "No se pudo crear el cliente." }, { status: 500 });
  }
}
