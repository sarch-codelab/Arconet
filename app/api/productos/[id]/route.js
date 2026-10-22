import { prisma } from "../../../../lib/prisma";
import { parseProducto } from "../../../../lib/productos";
import { toProducto } from "../../../../lib/serialize";
import { requireSession, requireRole } from "../../../../lib/dal";
import { writeLog } from "../../../../lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const { id } = await params;
  const producto = await prisma.producto.findUnique({ where: { id } });
  if (!producto) {
    return Response.json({ error: "Producto no encontrado." }, { status: 404 });
  }
  return Response.json(toProducto(producto));
}

export async function PATCH(request, { params }) {
  const guard = await requireRole(["administrador", "gerente"]);
  if (guard.response) return guard.response;
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
    const producto = await prisma.producto.update({
      where: { id },
      data: { ...data, updatedBy: guard.session?.correo ?? null },
    });
    await writeLog("panel", `Producto actualizado: ${producto.nombre} (${producto.sku})`, {
      actor: guard.session?.correo,
      ruta: `/api/productos/${id}`,
      detalle: { campos: Object.keys(data) },
    });
    return Response.json(toProducto(producto));
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "Producto no encontrado." }, { status: 404 });
    }
    if (error?.code === "P2002") {
      return Response.json({ error: "Ya existe un producto con ese SKU." }, { status: 409 });
    }
    console.error("PATCH /api/productos/[id]", error);
    await writeLog("db", `Error al actualizar producto ${id}: ${error?.message}`, {
      nivel: "error",
      actor: guard.session?.correo,
      ruta: `/api/productos/${id}`,
    });
    return Response.json({ error: "No se pudo actualizar el producto." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const guard = await requireRole(["administrador", "gerente"]);
  if (guard.response) return guard.response;
  const { id } = await params;

  try {
    const producto = await prisma.producto.delete({ where: { id } });
    await writeLog("panel", `Producto eliminado: ${producto.nombre} (${producto.sku})`, {
      nivel: "warn",
      actor: guard.session?.correo,
      ruta: `/api/productos/${id}`,
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "Producto no encontrado." }, { status: 404 });
    }
    console.error("DELETE /api/productos/[id]", error);
    await writeLog("db", `Error al eliminar producto ${id}: ${error?.message}`, {
      nivel: "error",
      actor: guard.session?.correo,
      ruta: `/api/productos/${id}`,
    });
    return Response.json({ error: "No se pudo eliminar el producto." }, { status: 500 });
  }
}
