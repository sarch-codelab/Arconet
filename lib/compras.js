// Servicio de compras: proveedores, órdenes de compra y recepción parcial.
// Cada recepción genera movimientos de kardex (entrada) con el costo real,
// actualiza cantidadRecibida por ítem y recalcula el estado de la OC.

import { prisma } from "./prisma";
import { aplicarMovimiento } from "./inventario";

export const ESTADOS_OC = ["borrador", "enviada", "parcial", "recibida", "cancelada"];

function text(value, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function int(value) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function number(value) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function fechaOrNull(value) {
  if (value == null || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseOrdenCompra(body, { partial = false } = {}) {
  const errors = [];
  const data = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body ?? {}, key);

  if (!partial || has("proveedorId")) {
    const proveedorId = text(body?.proveedorId, 60);
    if (!proveedorId) errors.push("El proveedor es obligatorio.");
    else data.proveedorId = proveedorId;
  }
  if (has("estado")) {
    const estado = text(body?.estado, 30) || "borrador";
    if (!ESTADOS_OC.includes(estado)) errors.push("Estado de orden de compra inválido.");
    else data.estado = estado;
  }
  if (has("fechaEsperada")) data.fechaEsperada = fechaOrNull(body.fechaEsperada);
  if (has("notas")) data.notas = text(body?.notas, 1000) || null;
  if (has("numero")) data.numero = text(body?.numero, 40) || null;

  if (has("items")) {
    if (!Array.isArray(body.items)) {
      errors.push("Los items deben ser una lista.");
    } else if (!body.items.length) {
      errors.push("La orden de compra necesita al menos un ítem.");
    } else if (body.items.length > 200) {
      errors.push("Demasiados ítems (máximo 200).");
    } else {
      const items = [];
      for (const raw of body.items) {
        const nombre = text(raw?.nombre, 200);
        const cantidad = int(raw?.cantidad);
        const costo = number(raw?.costoUnitario);
        if (!nombre) {
          errors.push("Cada ítem necesita un nombre.");
          break;
        }
        if (cantidad === null || cantidad <= 0) {
          errors.push(`Cantidad inválida en "${nombre}".`);
          break;
        }
        if (costo === null || costo < 0) {
          errors.push(`Costo inválido en "${nombre}".`);
          break;
        }
        items.push({
          productoId: text(raw?.productoId, 60) || null,
          nombre,
          cantidad,
          costoUnitario: costo,
        });
      }
      if (!errors.length) data.items = items;
    }
  }
  return { data, errors };
}

export async function siguienteNumeroOC() {
  const anio = new Date().getFullYear();
  const prefijo = `OC-${anio}-`;
  const ultima = await prisma.ordenCompra.findFirst({
    where: { numero: { startsWith: prefijo } },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  const consecutivo = ultima ? Number(ultima.numero.slice(prefijo.length)) || 0 : 0;
  return `${prefijo}${String(consecutivo + 1).padStart(4, "0")}`;
}

export function totalesOC(items) {
  const subtotal = items.reduce((sum, item) => sum + item.cantidad * item.costoUnitario, 0);
  return { subtotal, total: subtotal };
}

/**
 * Recepción (parcial o total) de una orden de compra.
 * - Exige bodega destino (o usa la principal si hay una sola).
 * - Genera movimientos de entrada en el kardex con el costo recibido.
 * - Marca items recibidos y pasa la OC a `parcial` o `recibida`.
 */
export async function recibirEnOC({ ocId, bodegaId, items, notas = null, actor = null }) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`oc-${ocId}`}))`;

    const oc = await tx.ordenCompra.findUnique({
      where: { id: ocId },
      include: { items: true },
    });
    if (!oc) {
      const error = new Error("Orden de compra no encontrada.");
      error.status = 404;
      throw error;
    }
    if (["recibida", "cancelada"].includes(oc.estado)) {
      const error = new Error(`La OC ${oc.numero} está ${oc.estado} y ya no admite recepciones.`);
      error.status = 400;
      throw error;
    }

    let bodega = bodegaId;
    if (!bodega) {
      const bodegas = await tx.bodega.findMany({ where: { estado: "activo" }, orderBy: { esPrincipal: "desc" } });
      if (bodegas.length === 1) bodega = bodegas[0].id;
      else if (bodegas.length > 1) {
        const error = new Error("Especificá la bodega destino de la recepción.");
        error.status = 400;
        throw error;
      } else {
        const error = new Error("No hay bodegas activas para recibir mercadería.");
        error.status = 400;
        throw error;
      }
    } else {
      const existe = await tx.bodega.findUnique({ where: { id: bodega }, select: { id: true } });
      if (!existe) {
        const error = new Error("La bodega indicada no existe.");
        error.status = 400;
        throw error;
      }
    }

    if (!Array.isArray(items) || !items.length) {
      const error = new Error("Indicá al menos un ítem a recibir.");
      error.status = 400;
      throw error;
    }

    const recibido = [];
    for (const raw of items) {
      const itemId = text(raw?.itemId, 60);
      const cantidad = int(raw?.cantidad);
      const costo = number(raw?.costoUnitario);
      if (!itemId || cantidad === null || cantidad <= 0) {
        const error = new Error("Cada recepción necesita itemId y cantidad positiva.");
        error.status = 400;
        throw error;
      }
      const item = oc.items.find((i) => i.id === itemId);
      if (!item) {
        const error = new Error("El ítem indicado no pertenece a esta orden de compra.");
        error.status = 400;
        throw error;
      }
      const restante = item.cantidad - item.cantidadRecibida;
      if (cantidad > restante) {
        const error = new Error(
          `No se pueden recibir ${cantidad} de "${item.nombre}": quedan ${restante} pendientes.`
        );
        error.status = 400;
        throw error;
      }

      const costoUnitario = costo ?? Number(item.costoUnitario);
      await aplicarMovimiento(tx, {
        tipo: "entrada",
        productoId: item.productoId,
        bodegaId: bodega,
        cantidad,
        costoUnitario,
        referencia: `oc:${oc.id}`,
        motivo: `Recepción OC ${oc.numero}${notas ? ` · ${notas}` : ""}`,
        actor,
        ordenCompraId: oc.id,
      });

      await tx.ordenCompraItem.update({
        where: { id: item.id },
        data: { cantidadRecibida: item.cantidadRecibida + cantidad },
      });
      recibido.push({ itemId: item.id, nombre: item.nombre, cantidad });
    }

    const itemsActualizados = await tx.ordenCompraItem.findMany({ where: { ordenCompraId: ocId } });
    const todoRecibido = itemsActualizados.every((item) => item.cantidadRecibida >= item.cantidad);
    const algoRecibido = itemsActualizados.some((item) => item.cantidadRecibida > 0);

    const estado = todoRecibido ? "recibida" : algoRecibido ? "parcial" : oc.estado;
    const orden = await tx.ordenCompra.update({
      where: { id: ocId },
      data: {
        estado,
        fechaRecepcion: todoRecibido ? new Date() : oc.fechaRecepcion,
        notas: notas ? `${oc.notas ? `${oc.notas}\n` : ""}Recepción: ${notas}` : oc.notas,
      },
      include: { items: true, proveedor: true },
    });

    return { orden, recibido };
  }, { timeout: 20_000 });
}
