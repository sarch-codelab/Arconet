import { prisma } from "../../../../lib/prisma";
import { parseSucursal } from "../../../../lib/sucursales";
import { toSucursal } from "../../../../lib/serialize";
import { requireSession, requireRole } from "../../../../lib/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const guard = await requireRole(["administrador", "gerente"]);
  if (guard.response) return guard.response;
  const { id } = await params;
  const sucursal = await prisma.sucursal.findUnique({ where: { id } });
  if (!sucursal) return Response.json({ error: "Sucursal no encontrada." }, { status: 404 });
  return Response.json(toSucursal(sucursal));
}

export async function PATCH(request, { params }) {
  const guard = await requireRole(["administrador"]);
  if (guard.response) return guard.response;
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parseSucursal(body, { partial: true });
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  try {
    const sucursal = await prisma.sucursal.update({ where: { id }, data });
    return Response.json(toSucursal(sucursal));
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "Sucursal no encontrada." }, { status: 404 });
    }
    if (error?.code === "P2002") {
      return Response.json({ error: "Ya existe una sucursal con ese código." }, { status: 409 });
    }
    console.error("PATCH /api/sucursales/[id]", error);
    return Response.json({ error: "No se pudo actualizar la sucursal." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const guard = await requireRole(["administrador"]);
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    await prisma.sucursal.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "Sucursal no encontrada." }, { status: 404 });
    }
    console.error("DELETE /api/sucursales/[id]", error);
    return Response.json({ error: "No se pudo eliminar la sucursal." }, { status: 500 });
  }
}
