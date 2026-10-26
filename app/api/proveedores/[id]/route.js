import { prisma } from "../../../../lib/prisma";
import { parseProveedor } from "../../../../lib/inventario";
import { requirePermission } from "../../../../lib/dal";
import { writeLog } from "../../../../lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const guard = await requirePermission("compras:read");
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const proveedor = await prisma.proveedor.findUnique({
      where: { id },
      include: {
        ordenes: {
          orderBy: { fecha: "desc" },
          take: 50,
          select: { id: true, numero: true, estado: true, fecha: true, total: true },
        },
      },
    });
    if (!proveedor) return Response.json({ error: "Proveedor no encontrado." }, { status: 404 });
    return Response.json(proveedor);
  } catch (error) {
    console.error("GET /api/proveedores/[id]", error?.message);
    return Response.json({ error: "No se pudo obtener el proveedor." }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const guard = await requirePermission("compras:write");
  if (guard.response) return guard.response;
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  const { data, errors } = parseProveedor(body, { partial: true });
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });
  try {
    const proveedor = await prisma.proveedor.update({ where: { id }, data });
    await writeLog("panel", `Proveedor actualizado: ${proveedor.nombre}`, {
      actor: guard.session.correo,
      ruta: `/api/proveedores/${id}`,
      detalle: data,
    });
    return Response.json(proveedor);
  } catch (error) {
    if (error?.code === "P2025") return Response.json({ error: "Proveedor no encontrado." }, { status: 404 });
    console.error("PATCH /api/proveedores/[id]", error);
    return Response.json({ error: "No se pudo actualizar el proveedor." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const guard = await requirePermission("compras:delete");
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const ordenes = await prisma.ordenCompra.count({ where: { proveedorId: id } });
    if (ordenes > 0) {
      // Con órdenes asociadas se desactiva para no perder el historial de compras.
      const proveedor = await prisma.proveedor.update({ where: { id }, data: { estado: "inactivo" } });
      await writeLog("panel", `Proveedor desactivado: ${proveedor.nombre}`, {
        actor: guard.session.correo,
        ruta: `/api/proveedores/${id}`,
      });
      return Response.json({ ok: true, desactivado: true, proveedor });
    }
    await prisma.proveedor.delete({ where: { id } });
    await writeLog("panel", `Proveedor eliminado: ${id}`, {
      actor: guard.session.correo,
      ruta: `/api/proveedores/${id}`,
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error?.code === "P2025") return Response.json({ error: "Proveedor no encontrado." }, { status: 404 });
    console.error("DELETE /api/proveedores/[id]", error);
    return Response.json({ error: "No se pudo eliminar el proveedor." }, { status: 500 });
  }
}
