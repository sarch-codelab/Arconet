import { resolveCatalogPrices } from "@/lib/precios-service";
import { prisma } from '@/lib/prisma';
import { parseOrden } from '@/lib/ordenes';
import { toOrden } from '@/lib/serialize';
import { requirePermission } from '@/lib/dal';
import { descontarStock, revertirStock, isStockSale } from '@/lib/stock-ventas';
import { writeLog } from '@/lib/logs';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const { items, ...ordenData } = data;
  try {
    const { orden, cambiaInventario } = await prisma.$transaction(
      async (tx) => {
        // Leer después de bloquear: otra edición puede haber cambiado el tipo
        // o el estado desde que se abrió el formulario del navegador.
        await tx.$executeRaw`SELECT id FROM "Orden" WHERE id = ${id} FOR UPDATE`;
        const existente = await tx.orden.findUnique({ where: { id }, include: { items: true } });
        if (!existente) {
          const error = new Error("Orden no encontrada.");
          error.status = 404;
          throw error;
        }
        if (body?.updatedAt != null && body.updatedAt !== existente.updatedAt?.toISOString()) {
          const error = new Error("El documento cambió desde que abriste el formulario. Recarga antes de guardar.");
          error.status = 409; throw error;
        }
        const descontabaStock = isStockSale(existente);
        const debeDescontarStock = isStockSale({ ...existente, ...ordenData });
        const cambiaInventario = descontabaStock !== debeDescontarStock ||
          (Boolean(items) && (descontabaStock || debeDescontarStock));
        const pricedItems = items ? await resolveCatalogPrices(tx, items, { previous: existente.items, editing: true }) : undefined;
        const amountChanged = pricedItems && (pricedItems.length !== existente.items.length || pricedItems.some((line, index) => {
          const old = existente.items[index];
          return line.productoId !== old.productoId || Number(line.cantidad) !== Number(old.cantidad) || Number(line.precio) !== Number(old.precio);
        }));
        const amount = pricedItems?.length ? (amountChanged ? pricedItems.reduce((total, line) => total + line.cantidad * line.precio, 0) : existente.monto) : pricedItems ? ordenData.monto ?? 0 : existente.items.length ? existente.monto : ordenData.monto;
        const actualizada = await tx.orden.update({
          where: { id },
          data: {
            ...ordenData,
            ...(amount !== undefined ? { monto: amount } : {}),
            ...(pricedItems ? { items: { deleteMany: {}, create: pricedItems } } : {}),
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
          if (debeDescontarStock && actualizada.items.length) {
            await descontarStock(tx, {
              referencia,
              items: actualizada.items,
              ordenId: id,
              actor: guard.session?.correo ?? null,
              motivo: `Salida por venta ${id}`,
            });
          }
        }

        return { orden: actualizada, cambiaInventario };
      },
      { timeout: 20_000 },
    );

    if (cambiaInventario) {
      await writeLog("panel", `Venta ${id} actualizada con ajuste de inventario`, {
        actor: guard.session?.correo,
        ruta: `/api/ordenes/${id}`,
        detalle: { estado: orden.estado, items: orden.items.length },
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
    const orden = await prisma.$transaction(
      async (tx) => {
        // Borrar toma primero el bloqueo de la orden, igual que PATCH; todo se
        // revierte si falla la devolución. Una cotización sin salidas no mueve stock.
        const eliminada = await tx.orden.delete({ where: { id } });
        await revertirStock(tx, {
          referencia: `venta:${id}`,
          actor: guard.session?.correo ?? null,
          motivo: "Documento eliminado: se devuelve el inventario pendiente",
        });
        return eliminada;
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
