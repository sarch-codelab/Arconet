import { prisma } from '@/lib/prisma";
import { parseOrden } from '@/lib/ordenes";
import { toOrden } from '@/lib/serialize";
import { requirePermission } from '@/lib/dal";
import { descontarStock, revertirStock } from '@/lib/stock-ventas";
import { writeLog } from '@/lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ESTADOS_SIN_STOCK = ["cancelada", "rechazada"];

export async function GET(_request, { params }) {
  const guard = await requirePermission("ordenes:read");
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
  const guard = await requirePermission("ordenes:write");
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

  const existente = await prisma.orden.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!existente) return Response.json({ error: "Orden no encontrada." }, { status: 404 });

  const { items, ...ordenData } = data;
  const estadoNuevo = ordenData.estado ?? existente.estado;
  const estabaSinStock = ESTADOS_SIN_STOCK.includes(existente.estado);
  const quedaSinStock = ESTADOS_SIN_STOCK.includes(estadoNuevo);
  const cambiaInventario =
    existente.tipo === "venta" && (Boolean(items) || estabaSinStock !== quedaSinStock);

  try {
    const orden = await prisma.$transaction(
      async (tx) => {
        const actualizada = await tx.orden.update({
          where: { id },
          data: {
            ...ordenData,
            ...(items ? { items: { deleteMany: {}, create: items } } : {}),
          },
          include: { cliente: true, items: true },
        });

        if (cambiaInventario) {
          const referencia = `venta:${id}`;
          // Primero se devuelve lo descontado y luego se aplica el estado/líneas
          // nuevas: así editar una venta nunca duplica ni pierde existencias.
          await revertirStock(tx, {
            referencia,
            actor: guard.session?.correo ?? null,
            motivo: "Ajuste de venta",
          });
          if (!quedaSinStock && actualizada.items.length) {
            await descontarStock(tx, {
              referencia,
              items: actualizada.items,
              ordenId: id,
              actor: guard.session?.correo ?? null,
              motivo: `Salida por venta ${id}`,
            });
          }
        }

        return actualizada;
      },
      { timeout: 20_000 },
    );

    if (cambiaInventario) {
      await writeLog("panel", `Venta ${id} actualizada con ajuste de inventario`, {
        actor: guard.session?.correo,
        ruta: `/api/ordenes/${id}`,
        detalle: { estado: estadoNuevo, items: items?.length ?? existente.items.length },
      });
    }

    return Response.json(toOrden(orden));
  } catch (error) {
    if (error?.status) return Response.json({ error: error.message }, { status: error.status });
    if (error?.code === "P2025") {
      return Response.json({ error: "Orden no encontrada." }, { status: 404 });
    }
    if (error?.code === "P2003") {
      return Response.json({ error: "El cliente o el producto indicado no existe." }, { status: 400 });
    }
    console.error("PATCH /api/ordenes/[id]", error);
    return Response.json({ error: "No se pudo actualizar la orden." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const guard = await requirePermission("ordenes:delete");
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const orden = await prisma.orden.findUnique({
      where: { id },
      select: { id: true, tipo: true },
    });
    if (!orden) return Response.json({ error: "Orden no encontrada." }, { status: 404 });

    await prisma.$transaction(
      async (tx) => {
        if (orden.tipo === "venta") {
          await revertirStock(tx, {
            referencia: `venta:${id}`,
            actor: guard.session?.correo ?? null,
            motivo: "Venta eliminada: se devuelve el inventario",
          });
        }
        await tx.orden.delete({ where: { id } });
      },
      { timeout: 20_000 },
    );

    await writeLog("panel", `Orden eliminada: ${id}`, {
      nivel: "warn",
      actor: guard.session?.correo,
      ruta: `/api/ordenes/${id}`,
      detalle: { tipo: orden.tipo },
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "Orden no encontrada." }, { status: 404 });
    }
    console.error("DELETE /api/ordenes/[id]", error);
    return Response.json({ error: "No se pudo eliminar la orden." }, { status: 500 });
  }
}
