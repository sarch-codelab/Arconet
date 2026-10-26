import { prisma } from "../../../../lib/prisma";
import { parseBodega } from "../../../../lib/inventario";
import { requirePermission } from "../../../../lib/dal";
import { writeLog } from "../../../../lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const guard = await requirePermission("inventario:write");
  if (guard.response) return guard.response;
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parseBodega(body, { partial: true });
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  try {
    const bodega = await prisma.bodega.update({ where: { id }, data });
    if (bodega.esPrincipal) {
      await prisma.bodega.updateMany({
        where: { id: { not: bodega.id }, esPrincipal: true },
        data: { esPrincipal: false },
      });
    }
    await writeLog("panel", `Bodega actualizada: ${bodega.nombre}`, {
      actor: guard.session.correo,
      ruta: `/api/bodegas/${id}`,
      detalle: data,
    });
    return Response.json(bodega);
  } catch (error) {
    if (error?.code === "P2025") return Response.json({ error: "Bodega no encontrada." }, { status: 404 });
    if (error?.code === "P2002") return Response.json({ error: "Ya existe una bodega con ese código." }, { status: 409 });
    console.error("PATCH /api/bodegas/[id]", error);
    return Response.json({ error: "No se pudo actualizar la bodega." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const guard = await requirePermission("inventario:delete");
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const movimientos = await prisma.movimientoKardex.count({ where: { bodegaId: id } });
    if (movimientos > 0) {
      // Con historial de kardex no se borra: se desactiva para conservar la auditoría.
      const bodega = await prisma.bodega.update({ where: { id }, data: { estado: "inactivo" } });
      await writeLog("panel", `Bodega desactivada: ${bodega.nombre}`, {
        actor: guard.session.correo,
        ruta: `/api/bodegas/${id}`,
      });
      return Response.json({ ok: true, desactivada: true, bodega });
    }
    const stock = await prisma.productoStock.count({ where: { bodegaId: id } });
    if (stock > 0) {
      return Response.json(
        { error: "La bodega tiene existencias: vacialá o transfiere antes de eliminarla." },
        { status: 409 }
      );
    }
    await prisma.bodega.delete({ where: { id } });
    await writeLog("panel", `Bodega eliminada: ${id}`, {
      actor: guard.session.correo,
      ruta: `/api/bodegas/${id}`,
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error?.code === "P2025") return Response.json({ error: "Bodega no encontrada." }, { status: 404 });
    console.error("DELETE /api/bodegas/[id]", error);
    return Response.json({ error: "No se pudo eliminar la bodega." }, { status: 500 });
  }
}
