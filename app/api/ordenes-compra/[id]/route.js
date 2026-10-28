import { prisma } from '@/lib/prisma';
import { parseOrdenCompra, totalesOC } from '@/lib/compras';
import { requirePermission } from '@/lib/dal';
import { writeLog } from '@/lib/logs';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SELECT_OC = {
  id: true,
  numero: true,
  proveedorId: true,
  estado: true,
  fecha: true,
  fechaEsperada: true,
  fechaRecepcion: true,
  subtotal: true,
  total: true,
  notas: true,
  createdBy: true,
  proveedor: { select: { id: true, nombre: true, rtn: true } },
  items: true,
};

export async function GET(_request, { params }) {
  const guard = await requirePermission("compras:read");
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const orden = await prisma.ordenCompra.findUnique({ where: { id }, select: SELECT_OC });
    if (!orden) return Response.json({ error: "Orden de compra no encontrada." }, { status: 404 });
    return Response.json(orden);
  } catch (error) {
    console.error("GET /api/ordenes-compra/[id]", error?.message);
    return Response.json({ error: "No se pudo obtener la orden." }, { status: 500 });
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
  const { data, errors } = parseOrdenCompra(body, { partial: true });
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  const { items, ...ordenData } = data;
  try {
    const orden = await prisma.$transaction(async (tx) => {
      const actual = await tx.ordenCompra.findUnique({ where: { id }, include: { items: true } });
      if (!actual) {
        const error = new Error("Orden de compra no encontrada.");
        error.code = "P2025";
        throw error;
      }
      if (actual.estado === "recibida" || actual.estado === "cancelada") {
        const error = new Error(`La OC está ${actual.estado}: no se puede editar.`);
        error.status = 409;
        throw error;
      }
      const alMenosRecibido = actual.items.some((item) => item.cantidadRecibida > 0);
      if (alMenosRecibido) {
        const error = new Error("La OC ya tiene recepciones parciales: no se pueden editar sus ítems.");
        error.status = 409;
        throw error;
      }
      if (items) {
        await tx.ordenCompraItem.deleteMany({ where: { ordenCompraId: id } });
        await tx.ordenCompraItem.createMany({
          data: items.map((item) => ({
            ordenCompraId: id,
            productoId: item.productoId,
            nombre: item.nombre,
            cantidad: item.cantidad,
            costoUnitario: item.costoUnitario,
          })),
        });
        const { subtotal, total } = totalesOC(items);
        await tx.ordenCompra.update({ where: { id }, data: { subtotal, total } });
      }
      return tx.ordenCompra.update({ where: { id }, data: ordenData, select: SELECT_OC });
    });
    await writeLog("panel", `Orden de compra actualizada: ${orden.numero}`, {
      actor: guard.session.correo,
      ruta: `/api/ordenes-compra/${id}`,
      detalle: ordenData,
    });
    return Response.json(orden);
  } catch (error) {
    if (error?.status) return Response.json({ error: error.message }, { status: error.status });
    if (error?.code === "P2025") return Response.json({ error: "Orden de compra no encontrada." }, { status: 404 });
    console.error("PATCH /api/ordenes-compra/[id]", error);
    return Response.json({ error: "No se pudo actualizar la orden." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const guard = await requirePermission("compras:delete");
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const orden = await prisma.ordenCompra.findUnique({ where: { id }, select: { estado: true, numero: true } });
    if (!orden) return Response.json({ error: "Orden de compra no encontrada." }, { status: 404 });
    if (orden.estado === "recibida" || orden.estado === "parcial") {
      // Con recepciones registradas no se borra: se cancela para conservar auditoría.
      const cancelada = await prisma.ordenCompra.update({ where: { id }, data: { estado: "cancelada" } });
      await writeLog("panel", `Orden de compra cancelada: ${orden.numero}`, {
        actor: guard.session.correo,
        ruta: `/api/ordenes-compra/${id}`,
      });
      return Response.json({ ok: true, cancelada: true, orden: cancelada });
    }
    await prisma.ordenCompra.delete({ where: { id } });
    await writeLog("panel", `Orden de compra eliminada: ${orden.numero}`, {
      nivel: "warn",
      actor: guard.session.correo,
      ruta: `/api/ordenes-compra/${id}`,
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error?.code === "P2025") return Response.json({ error: "Orden de compra no encontrada." }, { status: 404 });
    console.error("DELETE /api/ordenes-compra/[id]", error);
    return Response.json({ error: "No se pudo eliminar la orden." }, { status: 500 });
  }
}
