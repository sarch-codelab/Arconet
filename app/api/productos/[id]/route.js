import { prisma } from "../../../../lib/prisma";
import { parseProducto } from "../../../../lib/productos";
import { toProducto } from "../../../../lib/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const { id } = await params;
  const producto = await prisma.producto.findUnique({ where: { id } });
  if (!producto) {
    return Response.json({ error: "Producto no encontrado." }, { status: 404 });
  }
  return Response.json(toProducto(producto));
}

export async function PATCH(request, { params }) {
  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parseProducto(body, { partial: true });
  if (errors.length) {
    return Response.json({ error: errors[0], errors }, { status: 400 });
  }

  try {
    const producto = await prisma.producto.update({ where: { id }, data });
    return Response.json(toProducto(producto));
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "Producto no encontrado." }, { status: 404 });
    }
    if (error?.code === "P2002") {
      return Response.json({ error: "Ya existe un producto con ese SKU." }, { status: 409 });
    }
    console.error("PATCH /api/productos/[id]", error);
    return Response.json({ error: "No se pudo actualizar el producto." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const { id } = await params;

  try {
    await prisma.producto.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "Producto no encontrado." }, { status: 404 });
    }
    console.error("DELETE /api/productos/[id]", error);
    return Response.json({ error: "No se pudo eliminar el producto." }, { status: 500 });
  }
}
