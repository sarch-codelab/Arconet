import { prisma } from '@/lib/prisma";
import { parseSucursal } from '@/lib/sucursales";
import { toSucursal } from '@/lib/serialize";
import { requirePermission } from '@/lib/dal";
import { writeLog } from '@/lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const guard = await requirePermission("sucursales:read");
  if (guard.response) return guard.response;
  const { id } = await params;
  const sucursal = await prisma.sucursal.findUnique({ where: { id } });
  if (!sucursal) return Response.json({ error: "Sucursal no encontrada." }, { status: 404 });
  return Response.json(toSucursal(sucursal));
}

export async function PATCH(request, { params }) {
  const guard = await requirePermission("sucursales:write");
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
  const guard = await requirePermission("sucursales:delete");
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const sucursal = await prisma.sucursal.findUnique({
      where: { id },
      select: { id: true, nombre: true, codigo: true },
    });
    if (!sucursal) {
      return Response.json({ error: "Sucursal no encontrada." }, { status: 404 });
    }

    // No se puede borrar una sede con trabajadores o pedidos colgando de ella:
    // el aviso es explícito y queda registrado para saber por qué no se pudo.
    const [trabajadores, cuentas, bodegas] = await Promise.all([
      prisma.trabajador.count({ where: { sucursalId: id } }),
      prisma.usuario.count({ where: { sucursalId: id } }),
      prisma.bodega.count({ where: { sucursalId: id } }),
    ]);
    const asignados = trabajadores + cuentas;
    if (asignados || bodegas) {
      const detalle = asignados
        ? `${asignados} persona(s) asignada(s)`
        : `${bodegas} bodega(s) asociada(s)`;
      await writeLog("panel", `No se pudo eliminar la sucursal ${sucursal.nombre}: tiene ${detalle}`, {
        nivel: "warn",
        actor: guard.session?.correo,
        ruta: `/api/sucursales/${id}`,
      });
      return Response.json(
        { error: `No se puede eliminar "${sucursal.nombre}": tiene ${detalle}. Reasígnalos primero.` },
        { status: 409 },
      );
    }

    await prisma.sucursal.delete({ where: { id } });
    await writeLog("panel", `Sucursal eliminada: ${sucursal.nombre} (${sucursal.codigo})`, {
      nivel: "warn",
      actor: guard.session?.correo,
      ruta: `/api/sucursales/${id}`,
      detalle: { id: sucursal.id, codigo: sucursal.codigo },
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "Sucursal no encontrada." }, { status: 404 });
    }
    if (error?.code === "P2003") {
      await writeLog("db", `Sucursal ${id} con registros relacionados; no se eliminó`, {
        nivel: "warn",
        actor: guard.session?.correo,
        ruta: `/api/sucursales/${id}`,
      });
      return Response.json(
        { error: "Esta sucursal tiene registros asociados (trabajadores, pedidos o bodegas). Reasígnalos antes de eliminarla." },
        { status: 409 },
      );
    }
    console.error("DELETE /api/sucursales/[id]", error);
    await writeLog("db", `Error al eliminar sucursal ${id}: ${error?.message}`, {
      nivel: "error",
      actor: guard.session?.correo,
      ruta: `/api/sucursales/${id}`,
    });
    return Response.json({ error: "No se pudo eliminar la sucursal." }, { status: 500 });
  }
}
