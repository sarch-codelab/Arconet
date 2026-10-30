import { prisma } from "@/lib/prisma";
import {
  parseOrdenCompra,
  totalesOC,
  validatePurchaseReferences,
  purchaseDueDate,
  purchaseError,
} from "@/lib/compras";
import { samePurchaseFigures } from "@/lib/compras-form";
import { SELECT_PURCHASE } from "@/lib/compras-dto";
import { requirePermission } from "@/lib/dal";
import { writeLog } from "@/lib/logs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request, { params }) {
  const guard = await requirePermission("compras:read");
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const order = await prisma.ordenCompra.findUnique({
      where: { id },
      select: SELECT_PURCHASE,
    });
    return order
      ? Response.json(order, {
          headers: { "Cache-Control": "private, no-store" },
        })
      : Response.json({ error: "Documento no encontrado." }, { status: 404 });
  } catch {
    return Response.json(
      { error: "No se pudo cargar el documento." },
      { status: 503 },
    );
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
  if (errors.length)
    return Response.json({ error: errors[0] }, { status: 400 });
  if (
    Object.hasOwn(body, "updatedAt") &&
    (typeof body.updatedAt !== "string" ||
      Number.isNaN(Date.parse(body.updatedAt)))
  )
    return Response.json({ error: "Versión inválida." }, { status: 400 });
  try {
    const order = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`oc-${id}`}))`;
      const current = await tx.ordenCompra.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!current) throw purchaseError("Documento no encontrado.", 404);
      if (
        body.updatedAt &&
        new Date(current.updatedAt).toISOString() !== body.updatedAt
      )
        throw purchaseError(
          "El documento cambió. Recarga antes de guardar.",
          409,
        );
      if (data.tipo && data.tipo !== current.tipo)
        throw purchaseError(
          "Usa Convertir para generar una compra desde la cotización.",
        );
      if (["cancelada", "convertida"].includes(current.estado))
        throw purchaseError("Este documento ya está cerrado.", 409);
      const received = current.items.some((item) => item.cantidadRecibida > 0);
      const keys = Object.keys(data);
      if (
        received &&
        keys.some(
          (key) =>
            !["notas", "facturaProveedor", "envio", "estado"].includes(key),
        )
      )
        throw purchaseError(
          "Ya hay recepción: no se pueden sustituir proveedor, condiciones ni líneas.",
          409,
        );
      if (data.estado && data.estado !== current.estado) {
        const allowed =
          current.estado === "borrador"
            ? ["enviada", "cancelada"]
            : ["enviada", "parcial"].includes(current.estado)
              ? ["cancelada"]
              : [];
        if (!allowed.includes(data.estado))
          throw purchaseError("Transición de estado no permitida.", 409);
      }
      const { items, ...values } = data,
        merged = { ...current, ...values };
      if (merged.terminos === "credito" && !(merged.diasCredito > 0))
        throw purchaseError("Indica los días de crédito.");
      if (!received) {
        const sameFigures = !items || samePurchaseFigures(current.items, items);
        const unchanged =
          items &&
          sameFigures &&
          items.every(
            (item, index) => item.nombre === current.items[index]?.nombre,
          );
        if (items && !unchanged) {
          const validItems = await validatePurchaseReferences(
            tx,
            merged.proveedorId,
            items,
          );
          await tx.ordenCompraItem.deleteMany({ where: { ordenCompraId: id } });
          values.items = { create: validItems };
          if (!sameFigures) Object.assign(values, totalesOC(validItems));
        } else if (
          values.proveedorId &&
          values.proveedorId !== current.proveedorId
        ) {
          const provider = await tx.proveedor.findUnique({
            where: { id: values.proveedorId },
            select: { estado: true },
          });
          if (provider?.estado !== "activo")
            throw purchaseError("Selecciona un proveedor activo.");
        }
        values.fechaVencimiento = purchaseDueDate(
          merged.fecha,
          merged.terminos,
          merged.diasCredito,
        );
      }
      values.updatedAt = new Date(
        Math.max(Date.now(), (new Date(current.updatedAt).getTime() || 0) + 1),
      );
      return tx.ordenCompra.update({
        where: { id },
        data: values,
        select: SELECT_PURCHASE,
      });
    });
    await writeLog("panel", `Abastecimiento actualizado: ${order.numero}`, {
      actor: guard.session.correo,
      ruta: `/api/ordenes-compra/${id}`,
      detalle: { estado: order.estado },
    });
    return Response.json(order);
  } catch (error) {
    if (error.status)
      return Response.json({ error: error.message }, { status: error.status });
    console.error("PATCH compra", error?.message);
    return Response.json(
      { error: "No se pudo actualizar el documento." },
      { status: 503 },
    );
  }
}
export async function DELETE(_request, { params }) {
  const guard = await requirePermission("compras:delete");
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`oc-${id}`}))`;
      const order = await tx.ordenCompra.findUnique({
        where: { id },
        include: { items: true, compraGenerada: true },
      });
      if (!order) throw purchaseError("Documento no encontrado.", 404);
      if (
        order.items.some((item) => item.cantidadRecibida > 0) ||
        order.compraGenerada ||
        order.cotizacionOrigenId ||
        order.estado === "convertida"
      )
        throw purchaseError(
          "Hay recepción o conversión: conserva el documento y su auditoría. Cancela sólo el saldo pendiente desde Compras.",
          409,
        );
      if (order.estado !== "borrador")
        throw purchaseError(
          "Sólo se eliminan borradores; cancela los documentos confirmados.",
          409,
        );
      await tx.ordenCompra.delete({ where: { id } });
      return order.numero;
    });
    await writeLog("panel", `Borrador de abastecimiento eliminado: ${result}`, {
      actor: guard.session.correo,
      ruta: `/api/ordenes-compra/${id}`,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error.status ? error.message : "No se pudo eliminar." },
      { status: error.status || 503 },
    );
  }
}
