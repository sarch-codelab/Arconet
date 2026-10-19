import { prisma } from "../../../lib/prisma";
import { newSucursalId, parseSucursal } from "../../../lib/sucursales";
import { toSucursal } from "../../../lib/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sucursales = await prisma.sucursal.findMany({ orderBy: { codigo: "asc" } });
  return Response.json(sucursales.map(toSucursal));
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parseSucursal(body);
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  try {
    const sucursal = await prisma.sucursal.create({
      data: { id: newSucursalId(), ...data },
    });
    return Response.json(toSucursal(sucursal), { status: 201 });
  } catch (error) {
    if (error?.code === "P2002") {
      return Response.json({ error: "Ya existe una sucursal con ese código." }, { status: 409 });
    }
    console.error("POST /api/sucursales", error);
    return Response.json({ error: "No se pudo crear la sucursal." }, { status: 500 });
  }
}
