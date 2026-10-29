import { resolveCatalogPrices } from "./precios-service";
// Fase B · Facturación: documentos fiscales (factura, nota de crédito,
// nota de débito) con impuestos y descuentos por línea, correlativo,
// anulaciones con motivo, libro de ventas y huella SHA-256 de inmutabilidad.
//
// El CAI, la serie y el correlativo autorizados viven en
// ConfiguracionSistema (claves fiscal.cai, fiscal.serie, fiscal.correlativo
// siguiente). Hasta que el usuario configure los rangos autorizados, los
// documentos se emiten sin CAI marcados como "pendiente de CAI" — nada se
// imprime como factura fiscal hasta que haya rango asignado.

import { createHash } from "node:crypto";
import { prisma } from "./prisma";

export const TIPOS_DOCUMENTO = ["factura", "nota_credito", "nota_debito"];
export const ESTADOS_DOCUMENTO = ["emitido", "anulado"];
export const IMPUESTO_POR_DEFECTO = 15; // ISV Honduras 15%

function text(value, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function number(value, fallback = null) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Cálculo de totales por línea: cantidad × precio − descuento, más ISV.
 * Devuelve { items, subtotal, descuento, impuesto, total }.
 */
export function calcularTotales(items, { impuestoPorcentaje = IMPUESTO_POR_DEFECTO } = {}) {
  const errors = [];
  const normalizados = [];
  let subtotal = 0;
  let descuento = 0;
  let impuesto = 0;

  for (const raw of Array.isArray(items) ? items : []) {
    const descripcion = text(raw?.descripcion, 300);
    const cantidad = number(raw?.cantidad);
    const precio = number(raw?.precio);
    const lineaDescuento = number(raw?.descuento, 0) ?? 0;
    const porcentaje = number(raw?.impuestoPorcentaje, impuestoPorcentaje) ?? impuestoPorcentaje;
    if (!descripcion) {
      errors.push("Cada línea necesita una descripción.");
      break;
    }
    if (cantidad === null || cantidad <= 0) {
      errors.push(`Cantidad inválida en "${descripcion}".`);
      break;
    }
    if (precio === null || precio < 0) {
      errors.push(`Precio inválido en "${descripcion}".`);
      break;
    }
    if (lineaDescuento < 0) {
      errors.push(`Descuento inválido en "${descripcion}".`);
      break;
    }
    if (porcentaje < 0 || porcentaje > 100) {
      errors.push(`Porcentaje de impuesto inválido en "${descripcion}".`);
      break;
    }
    const base = round2(cantidad * precio - lineaDescuento);
    if (base < 0) {
      errors.push(`El descuento de "${descripcion}" supera el importe de la línea.`);
      break;
    }
    const impuestoLinea = round2((base * porcentaje) / 100);
    subtotal += base;
    descuento += lineaDescuento;
    impuesto += impuestoLinea;
    normalizados.push({
      productoId: text(raw?.productoId, 60) || null,
      descripcion,
      cantidad,
      precio,
      descuento: lineaDescuento,
      impuestoPorcentaje: porcentaje,
      subtotal: base,
      ...(raw.nivelPrecio ? { nivelPrecio: raw.nivelPrecio, precioBase: raw.precioBase } : {}),
    });
  }

  return {
    errors,
    items: normalizados,
    subtotal: round2(subtotal),
    descuento: round2(descuento),
    impuesto: round2(impuesto),
    total: round2(subtotal + impuesto),
  };
}

export async function obtenerConfigFiscal() {
  const claves = ["fiscal.cai", "fiscal.serie", "fiscal.correlativo", "fiscal.nit", "fiscal.nombre", "fiscal.direccion"];
  const filas = await prisma.configuracionSistema.findMany({ where: { clave: { in: claves } } });
  const config = {};
  for (const fila of filas) config[fila.clave.replace("fiscal.", "")] = fila.valor;
  return {
    cai: config.cai || null,
    serie: config.serie || null,
    correlativo: config.correlativo ? Number(config.correlativo) : null,
    nit: config.nit || null,
    nombre: config.nombre || null,
    direccion: config.direccion || null,
    tieneRango: Boolean(config.cai && config.serie && config.correlativo),
  };
}

function formatoCorrelativo(serie, numero) {
  return `${serie}-${String(numero).padStart(9, "0")}`;
}

/** Genera la huella SHA-256 de un documento (para el PDF inmutable). */
export function huellaDocumento(documento, items) {
  const canonico = JSON.stringify({
    id: documento.id,
    tipo: documento.tipo,
    cai: documento.cai,
    numero: documento.numero,
    fecha: new Date(documento.fecha).toISOString(),
    clienteId: documento.clienteId,
    ordenId: documento.ordenId,
    subtotal: Number(documento.subtotal),
    descuento: Number(documento.descuento),
    impuesto: Number(documento.impuesto),
    total: Number(documento.total),
    items: items.map((item) => ({
      productoId: item.productoId ?? null,
      descripcion: item.descripcion,
      cantidad: String(Number(item.cantidad)),
      precio: String(Number(item.precio)),
      descuento: String(Number(item.descuento)),
      impuestoPorcentaje: String(Number(item.impuestoPorcentaje)),
      subtotal: String(Number(item.subtotal)),
      ...(item.nivelPrecio ? { nivelPrecio: item.nivelPrecio, precioBase: String(Number(item.precioBase)) } : {}),
    })),
  });
  return createHash("sha256").update(canonico).digest("hex");
}

/**
 * Emite un documento fiscal dentro de una transacción. Reserva el
 * correlativo del rango autorizado si está configurado; si no, lo emite
 * pendiente de CAI con numero null.
 */
export async function emitirDocumentoFiscal({ tx, tipo, clienteId, ordenId = null, items, impuestoPorcentaje, actor, canDiscount = false }) {
  const pricedItems = await resolveCatalogPrices(tx, items, { fiscal: true, canDiscount });
  const calculo = calcularTotales(pricedItems, { impuestoPorcentaje });
  if (calculo.errors.length) {
    const error = new Error(calculo.errors[0]);
    error.status = 400;
    throw error;
  }

  const config = await obtenerConfigFiscal();
  let numero = null;
  let cai = config.cai ?? null;
  let serie = config.serie ?? null;

  if (config.tieneRango) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('fiscal-correlativo'))`;
    const fila = await tx.configuracionSistema.findUnique({ where: { clave: "fiscal.correlativo" } });
    const siguiente = Number(fila.valor);
    numero = formatoCorrelativo(config.serie, siguiente);
    await tx.configuracionSistema.update({
      where: { clave: "fiscal.correlativo" },
      data: { valor: String(siguiente + 1) },
    });
  }

  const creado = await tx.documentoFiscal.create({
    data: {
      tipo,
      cai,
      serie,
      correlativo: numero,
      clienteId,
      ordenId,
      subtotal: calculo.subtotal,
      descuento: calculo.descuento,
      impuesto: calculo.impuesto,
      total: calculo.total,
      emitidoPor: actor,
      items: { create: calculo.items },
    },
    include: { items: true },
  });

  const huella = huellaDocumento(creado, creado.items);
  const final = await tx.documentoFiscal.update({
    where: { id: creado.id },
    data: { pdfHash: huella },
    include: { items: true, cliente: true },
  });
  return { documento: final, tieneRango: config.tieneRango };
}

/** Libro de ventas por rango de fechas (CSV listo para exportar). */
export async function libroDeVentas({ desde, hasta, soloEmitidos = true } = {}) {
  const where = { tipo: "factura" };
  if (soloEmitidos) where.estado = "emitido";
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha.gte = new Date(desde);
    if (hasta) where.fecha.lte = new Date(hasta);
  }
  const documentos = await prisma.documentoFiscal.findMany({
    where,
    orderBy: { fecha: "asc" },
    include: { cliente: { select: { nombre: true, rtn: true } }, items: true },
  });
  const totales = documentos.reduce(
    (acc, doc) => ({
      subtotal: acc.subtotal + Number(doc.subtotal),
      descuento: acc.descuento + Number(doc.descuento),
      impuesto: acc.impuesto + Number(doc.impuesto),
      total: acc.total + Number(doc.total),
    }),
    { subtotal: 0, descuento: 0, impuesto: 0, total: 0 }
  );
  return { documentos, totales };
}
