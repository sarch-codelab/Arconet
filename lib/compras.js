// Abastecimiento: cotización al proveedor → compra confirmada → recepción.
// Cotizar, confirmar y editar cabeceras no crean existencias ni pagos.
import { createHash } from "node:crypto";
import { prisma } from "./prisma";
import { aplicarMovimiento } from "./inventario";
import { MAX_DOCUMENT_AMOUNT } from "./ventas-form";
import {
  PURCHASE_TYPES,
  PURCHASE_TERMS,
  validPurchaseLine,
  purchaseTotals,
  strictNumber,
  MAX_PURCHASE_QUANTITY,
  businessPurchaseDate,
} from "./compras-form";

export const ESTADOS_OC = [
  "borrador",
  "enviada",
  "parcial",
  "recibida",
  "cancelada",
  "convertida",
];
const text = (value, max = 1000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
export function purchaseError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}
function date(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value))
    return null;
  const parsed = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00.000Z` : value,
  );
  return Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value.slice(0, 10)
    ? null
    : parsed;
}
export function purchaseDueDate(fecha, terminos, diasCredito) {
  if (terminos !== "credito") return null;
  const result = new Date(fecha);
  result.setUTCDate(result.getUTCDate() + diasCredito);
  return result;
}
export function parseOrdenCompra(body, { partial = false } = {}) {
  const errors = [],
    data = {},
    has = (key) => Object.hasOwn(body || {}, key);
  if (!partial || has("tipo")) {
    data.tipo = body?.tipo || "compra";
    if (!PURCHASE_TYPES.includes(data.tipo))
      errors.push("Tipo de abastecimiento inválido.");
  }
  if (!partial || has("proveedorId")) {
    data.proveedorId = text(body?.proveedorId, 60);
    if (!data.proveedorId) errors.push("El proveedor es obligatorio.");
  }
  if (has("estado")) {
    data.estado = body.estado;
    if (!["borrador", "enviada", "cancelada"].includes(data.estado))
      errors.push(
        "El estado de almacén sólo cambia mediante una recepción o conversión.",
      );
  }
  for (const key of ["fecha", "fechaEsperada"])
    if (has(key)) {
      data[key] = body[key] ? date(body[key]) : null;
      if ((body[key] && !data[key]) || (key === "fecha" && !data[key]))
        errors.push("Fecha inválida.");
    }
  for (const [key, max] of [
    ["notas", 1000],
    ["requeridoA", 150],
    ["facturaProveedor", 100],
    ["envio", 200],
  ])
    if (has(key)) data[key] = text(body[key], max) || null;
  if (has("terminos") || !partial) {
    data.terminos = body?.terminos || "contado";
    if (!PURCHASE_TERMS.includes(data.terminos))
      errors.push("Selecciona contado o crédito.");
  }
  if (has("diasCredito") || !partial) {
    data.diasCredito = strictNumber(body?.diasCredito ?? 0);
    if (
      !Number.isInteger(data.diasCredito) ||
      data.diasCredito < 0 ||
      data.diasCredito > 3650
    )
      errors.push("El plazo debe ser un número entero entre 0 y 3650 días.");
  }
  if (data.terminos === "credito" && !(data.diasCredito > 0))
    errors.push("Indica los días de crédito.");
  if (data.terminos === "contado") data.diasCredito = 0;
  if (has("moneda") || !partial) {
    data.moneda = body?.moneda || "HNL";
    if (data.moneda !== "HNL")
      errors.push(
        "Las compras de este módulo se registran en moneda nacional (HNL).",
      );
  }
  if (!partial && (!Array.isArray(body?.items) || !body.items.length))
    errors.push("Añade al menos un producto o concepto.");
  if (has("items")) {
    if (
      !Array.isArray(body.items) ||
      !body.items.length ||
      body.items.length > 100
    )
      errors.push("Añade entre 1 y 100 líneas.");
    else {
      data.items = body.items.map((raw) => ({
        productoId: text(raw?.productoId, 60) || null,
        nombre: text(raw?.nombre, 200),
        cantidad: strictNumber(raw?.cantidad),
        costoUnitario: strictNumber(raw?.costoUnitario),
        impuestoPorcentaje: strictNumber(raw?.impuestoPorcentaje ?? 0),
      }));
      if (!data.items.every(validPurchaseLine))
        errors.push(
          "Revisa las líneas: cantidad entera positiva, costo con 2 decimales e ISV de 0, 15 o 18%.",
        );
      const total = purchaseTotals(data.items).total;
      if (!Number.isFinite(total) || total > MAX_DOCUMENT_AMOUNT)
        errors.push("El total supera el importe máximo permitido.");
    }
  }
  return { data, errors };
}
export async function siguienteNumeroOC(tx = prisma, tipo = "compra") {
  const prefijo = `${tipo === "cotizacion" ? "CP" : "OC"}-${businessPurchaseDate().slice(0, 4)}-`;
  const rows = await tx.ordenCompra.findMany({
    where: { numero: { startsWith: prefijo } },
    select: { numero: true },
  });
  const max = rows.reduce(
    (n, row) => Math.max(n, Number(row.numero.slice(prefijo.length)) || 0),
    0,
  );
  return `${prefijo}${String(max + 1).padStart(6, "0")}`;
}
export const totalesOC = purchaseTotals;
export async function validatePurchaseReferences(tx, proveedorId, items) {
  const provider = await tx.proveedor.findUnique({
    where: { id: proveedorId },
    select: { estado: true },
  });
  if (!provider || provider.estado !== "activo")
    throw purchaseError("Selecciona un proveedor activo.");
  const ids = [
    ...new Set(
      items.filter((item) => item.productoId).map((item) => item.productoId),
    ),
  ];
  const products = ids.length
    ? await tx.producto.findMany({
        where: { id: { in: ids }, archivado: false, estado: "activo" },
        select: { id: true, nombre: true },
      })
    : [];
  if (products.length !== ids.length)
    throw purchaseError(
      "Una línea usa un producto no disponible. Revisa el catálogo.",
    );
  const byId = new Map(products.map((product) => [product.id, product]));
  return items.map((item) => ({
    ...item,
    nombre: byId.get(item.productoId)?.nombre || item.nombre,
  }));
}
export async function convertirCotizacionCompra(id, actor) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`oc-${id}`}))`;
      const quote = await tx.ordenCompra.findUnique({
        where: { id },
        include: { items: true, compraGenerada: true },
      });
      if (!quote || quote.tipo !== "cotizacion")
        throw purchaseError("Cotización de proveedor no encontrada.", 404);
      if (quote.compraGenerada) return quote.compraGenerada;
      if (!["borrador", "enviada"].includes(quote.estado))
        throw purchaseError("La cotización no admite conversión.", 409);
      const items = await validatePurchaseReferences(
        tx,
        quote.proveedorId,
        quote.items.map(
          ({
            productoId,
            nombre,
            cantidad,
            costoUnitario,
            impuestoPorcentaje,
          }) => ({
            productoId,
            nombre,
            cantidad,
            costoUnitario,
            impuestoPorcentaje,
          }),
        ),
      );
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('oc-numeracion'))`;
      const order = await tx.ordenCompra.create({
        data: {
          numero: await siguienteNumeroOC(tx),
          tipo: "compra",
          estado: "borrador",
          cotizacionOrigenId: id,
          proveedorId: quote.proveedorId,
          requeridoA: quote.requeridoA,
          terminos: quote.terminos,
          diasCredito: quote.diasCredito,
          fechaEsperada: quote.fechaEsperada,
          fecha: date(businessPurchaseDate()),
          fechaVencimiento: purchaseDueDate(
            date(businessPurchaseDate()),
            quote.terminos,
            quote.diasCredito,
          ),
          envio: quote.envio,
          moneda: quote.moneda,
          notas: quote.notas,
          ...purchaseTotals(items),
          createdBy: actor,
          items: { create: items },
        },
      });
      await tx.ordenCompra.update({
        where: { id },
        data: {
          estado: "convertida",
          updatedAt: new Date(
            Math.max(
              Date.now(),
              (new Date(quote.updatedAt).getTime() || 0) + 1,
            ),
          ),
        },
      });
      return order;
    },
    { timeout: 20000 },
  );
}

export async function recibirEnOC({
  ocId,
  bodegaId,
  items,
  requestId,
  notas = null,
  actor = null,
}) {
  if (
    typeof requestId !== "string" ||
    !/^[a-zA-Z0-9-]{16,100}$/.test(requestId)
  )
    throw purchaseError(
      "La recepción necesita una clave de operación válida. Reabre el formulario.",
    );
  if (!Array.isArray(items) || !items.length || items.length > 100)
    throw purchaseError("Indica entre 1 y 100 líneas a recibir.");
  const lines = items
    .map((raw) => ({
      itemId: text(raw?.itemId, 60),
      cantidad: strictNumber(raw?.cantidad),
    }))
    .sort((a, b) => a.itemId.localeCompare(b.itemId));
  if (
    new Set(lines.map((line) => line.itemId)).size !== lines.length ||
    lines.some(
      (line) =>
        !line.itemId ||
        !Number.isInteger(line.cantidad) ||
        line.cantidad <= 0 ||
        line.cantidad > MAX_PURCHASE_QUANTITY,
    )
  )
    throw purchaseError(
      "No repitas líneas y usa cantidades enteras positivas.",
    );
  if (items.some((raw) => Object.hasOwn(raw, "costoUnitario")))
    throw purchaseError(
      "El costo se acuerda en la compra antes de recibir; no se cambia desde recepción.",
    );
  const huella = createHash("sha256")
    .update(JSON.stringify({ ocId, bodegaId, lines, notas }))
    .digest("hex");
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`oc-${ocId}`}))`;
      const oc = await tx.ordenCompra.findUnique({
        where: { id: ocId },
        include: { items: true, proveedor: true },
      });
      if (!oc || oc.tipo !== "compra")
        throw purchaseError("Compra no encontrada.", 404);
      const previous = await tx.recepcionCompra.findUnique({
        where: { requestId },
      });
      if (previous) {
        if (previous.ordenCompraId !== ocId || previous.huella !== huella)
          throw purchaseError("Esta clave ya se usó con otra recepción.", 409);
        return { orden: oc, recibido: previous.detalle, replayed: true };
      }
      if (!["enviada", "parcial"].includes(oc.estado))
        throw purchaseError(
          "Confirma la compra antes de recibir; las compras cerradas no admiten más recepciones.",
          409,
        );
      const warehouse = bodegaId
        ? await tx.bodega.findUnique({
            where: { id: bodegaId },
            select: { estado: true },
          })
        : null;
      if (warehouse?.estado !== "activo")
        throw purchaseError("Selecciona una bodega activa.");
      // Orden estable de bloqueos por producto para recepciones concurrentes.
      const pending = lines
        .map((line) => {
          const item = oc.items.find((row) => row.id === line.itemId);
          if (!item || line.cantidad > item.cantidad - item.cantidadRecibida)
            throw purchaseError(
              "Una cantidad supera el pendiente de la compra. Actualiza el documento.",
              409,
            );
          return { ...line, item };
        })
        .sort((a, b) =>
          (a.item.productoId || a.item.id).localeCompare(
            b.item.productoId || b.item.id,
          ),
        );
      const recibido = [];
      for (const line of pending) {
        const { item, cantidad } = line;
        if (item.productoId)
          await aplicarMovimiento(tx, {
            tipo: "entrada",
            productoId: item.productoId,
            bodegaId,
            cantidad,
            costoUnitario: Number(item.costoUnitario),
            referencia: `oc:${oc.id}`,
            motivo: `Recepción OC ${oc.numero}${notas ? ` · ${notas}` : ""}`,
            actor,
            ordenCompraId: oc.id,
          });
        await tx.ordenCompraItem.update({
          where: { id: item.id },
          data: { cantidadRecibida: item.cantidadRecibida + cantidad },
        });
        recibido.push({
          itemId: item.id,
          productoId: item.productoId,
          nombre: item.nombre,
          cantidad,
        });
      }
      const updatedItems = await tx.ordenCompraItem.findMany({
        where: { ordenCompraId: ocId },
      });
      const complete = updatedItems.every(
        (item) => item.cantidadRecibida >= item.cantidad,
      );
      const orden = await tx.ordenCompra.update({
        where: { id: ocId },
        data: {
          updatedAt: new Date(
            Math.max(Date.now(), (new Date(oc.updatedAt).getTime() || 0) + 1),
          ),
          estado: complete ? "recibida" : "parcial",
          fechaRecepcion: complete ? new Date() : oc.fechaRecepcion,
        },
        include: { items: true, proveedor: true },
      });
      await tx.recepcionCompra.create({
        data: {
          ordenCompraId: ocId,
          requestId,
          huella,
          bodegaId,
          detalle: recibido,
          notas,
          actor,
        },
      });
      return { orden, recibido, replayed: false };
    },
    { timeout: 20000 },
  );
}
