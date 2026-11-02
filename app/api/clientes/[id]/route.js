import { prisma } from '@/lib/prisma';
import { parseCliente } from '@/lib/clientes';
import { guardarImagenSiHaceFalta } from "@/lib/almacen-fotos";
import { toCliente } from '@/lib/serialize';
import { requirePermission } from '@/lib/dal';
import { revertirStock } from "@/lib/stock-ventas";
import { writeLog } from "@/lib/logs";
import { SUPER_ROLE } from "@/lib/permisos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const guard = await requirePermission("clientes:read");
  if (guard.response) return guard.response;
  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) return Response.json({ error: "Cliente no encontrado." }, { status: 404 });
  return Response.json(toCliente(cliente));
}

export async function PATCH(request, { params }) {
  const guard = await requirePermission("clientes:write");
  if (guard.response) return guard.response;
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parseCliente(body, { partial: true });
  if (!errors.length && Object.hasOwn(data, "foto") && data.foto) {
    try {
      data.foto = await guardarImagenSiHaceFalta({ valor: data.foto, carpeta: "clientes", base: id });
    } catch (error) {
      errors.push(error.message || "No se pudo guardar la imagen.");
    }
  }
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  try {
    const cliente = await prisma.$transaction(async (tx) => {
      const updated = await tx.cliente.update({ where: { id }, data });
      if (Object.prototype.hasOwnProperty.call(data, "correo")) {
        if (data.correo) {
          await tx.clienteCuenta.updateMany({
            where: { clienteId: id },
            data: { correo: data.correo.toLowerCase(), activo: true },
          });
        } else {
          await tx.clienteCuenta.updateMany({ where: { clienteId: id }, data: { activo: false } });
        }
      }
      return updated;
    });
    return Response.json(toCliente(cliente));
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "Cliente no encontrado." }, { status: 404 });
    }
    if (error?.code === "P2002" || error?.code === "23505") {
      return Response.json({ error: "Ese correo ya está asociado a otra cuenta." }, { status: 409 });
    }
    console.error("PATCH /api/clientes/[id]", error);
    return Response.json({ error: "No se pudo actualizar el cliente." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const guard = await requirePermission("clientes:delete");
  if (guard.response) return guard.response;
  const { id } = await params;
  const permisos = guard.permisos || [];
  const actor = guard.session?.correo ?? null;
  const canDeleteFiscalDocuments = guard.session?.rol === SUPER_ROLE;

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // Bloquea el cliente mientras se leen y eliminan sus relaciones. Una alta
      // concurrente no puede quedar fuera de la cascada por una lectura vieja.
      await tx.$executeRaw`SELECT id FROM "Cliente" WHERE id = ${id} FOR UPDATE`;
      const cliente = await tx.cliente.findUnique({
        where: { id },
        select: { id: true, nombre: true },
      });
      if (!cliente) throw Object.assign(new Error("Cliente no encontrado."), { status: 404 });

      const ordenes = await tx.orden.findMany({
        where: { clienteId: id },
        select: { id: true, tipo: true },
      });
      const ordenIds = ordenes.map(orden => orden.id);
      const documentos = await tx.documentoFiscal.findMany({
        where: ordenIds.length
          ? { OR: [{ clienteId: id }, { ordenId: { in: ordenIds } }] }
          : { clienteId: id },
        select: { id: true, tipo: true },
      });

      // Eliminar el cliente no debe convertirse en un atajo para saltarse los
      // permisos de otros módulos. La cascada fiscal es exclusiva de administrador.
      if (ordenes.length && !permisos.includes("ordenes:delete")) {
        throw Object.assign(new Error("Tu rol también necesita permiso para eliminar las órdenes asociadas."), { status: 403 });
      }
      if (documentos.length && !canDeleteFiscalDocuments) {
        throw Object.assign(new Error("Solo el rol administrador puede eliminar un cliente con documentos fiscales asociados."), { status: 403 });
      }

      // Devuelve solamente saldos aún descontados. Los reversos anteriores se
      // respetan y una factura vinculada a una venta no se devuelve dos veces.
      for (const orden of ordenes.filter(orden => orden.tipo === "venta")) {
        await revertirStock(tx, {
          referencia: `venta:${orden.id}`,
          actor,
          motivo: `Cliente ${cliente.nombre} eliminado: devolución de inventario de la orden`,
        });
      }
      for (const documento of documentos.filter(documento => documento.tipo === "factura")) {
        await revertirStock(tx, {
          referencia: `factura:${documento.id}`,
          actor,
          motivo: `Cliente ${cliente.nombre} eliminado: devolución de inventario de la factura`,
        });
      }

      // DocumentoFiscalItem, OrdenItem, pagos, eventos, entregas y devoluciones
      // ya tienen cascada en sus relaciones. Primero se eliminan los documentos
      // que referencian esas órdenes y después la cuenta del cliente.
      if (documentos.length) {
        await tx.documentoFiscal.deleteMany({ where: { id: { in: documentos.map(documento => documento.id) } } });
      }
      if (ordenIds.length) {
        await tx.orden.deleteMany({ where: { id: { in: ordenIds } } });
      }
      await tx.cliente.delete({ where: { id } });
      return { cliente, ordenes, documentos };
    }, { timeout: 30_000 });

    await writeLog("panel", `Cliente eliminado con sus registros asociados: ${resultado.cliente.nombre}`, {
      nivel: "warn",
      actor,
      ruta: `/api/clientes/${id}`,
      detalle: {
        clienteId: id,
        ordenesEliminadas: resultado.ordenes.length,
        documentosEliminados: resultado.documentos.length,
      },
    });
    return Response.json({
      ok: true,
      ordenesEliminadas: resultado.ordenes.length,
      documentosEliminados: resultado.documentos.length,
    });
  } catch (error) {
    if (error?.status) return Response.json({ error: error.message }, { status: error.status });
    if (error?.code === "P2025") {
      return Response.json({ error: "Cliente no encontrado." }, { status: 404 });
    }
    if (error?.code === "P2003") {
      return Response.json(
        { error: "No se pudo eliminar porque aún existen registros asociados. Recarga e inténtalo de nuevo." },
        { status: 409 },
      );
    }
    console.error("DELETE /api/clientes/[id]", error);
    return Response.json({ error: "No se pudo eliminar el cliente." }, { status: 500 });
  }
}
