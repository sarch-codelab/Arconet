import { prisma } from "../../../../lib/prisma";
import { parseOrden } from "../../../../lib/ordenes";
import { toOrden } from "../../../../lib/serialize";
import { requireSession } from "../../../../lib/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { id } = await params;
  const orden = await prisma.orden.findUnique({
    where: { id },
    include: { cliente: true, items: true },
  });
  if (!orden) return Response.json({ error: "Orden no encontrada." }, { status: 404 });
  return Response.json(toOrden(orden));
}

export async function PATCH(request, { params }) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parseOrden(body, { partial: true });
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  const { items, ...ordenData } = data;
  try {
    if (items) {
      await prisma.ordenItem.deleteMany({ where: { ordenId: id } });
      ordenData.items = { create: items };
    }
    const orden = await prisma.orden.update({
      where: { id },
      data: ordenData,
      include: { cliente: true, items: true },
    });
    return Response.json(toOrden(orden));
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "Orden no encontrada." }, { status: 404 });
    }
    if (error?.code === "P2003") {
      return Response.json({ error: "El cliente indicado no existe." }, { status: 400 });
    }
    console.error("PATCH /api/ordenes/[id]", error);
    return Response.json({ error: "No se pudo actualizar la orden." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    await prisma.orden.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "Orden no encontrada." }, { status: 404 });
    }
    console.error("DELETE /api/ordenes/[id]", error);
    return Response.json({ error: "No se pudo eliminar la orden." }, { status: 500 });
  }
}
