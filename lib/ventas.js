// Servicio de ventas: ciclo de vida de cotizaciones/ventas, pagos parciales,
// vencimientos, entregas y devoluciones. Todas las transiciones pasan por
// puedeTransicionar() y dejan rastro en OrdenEvento (historial auditable).

import { prisma } from "./prisma";

export const ORDER_STATUSES = [
  "pendiente",
  "en_proceso",
  "aprobada",
  "rechazada",
  "en_preparacion",
  "despachada",
  "entregada",
  "completada",
  "vencida",
  "cancelada",
];

/** Estados desde los que no se sale. */
const TERMINALES = new Set(["completada", "rechazada", "cancelada"]);

export const TRANSICIONES = {
  pendiente: ["en_proceso", "aprobada", "rechazada", "vencida", "cancelada"],
  en_proceso: ["aprobada", "rechazada", "vencida", "cancelada"],
  aprobada: ["en_preparacion", "despachada", "entregada", "completada", "vencida", "cancelada"],
  vencida: ["pendiente", "en_proceso", "aprobada", "cancelada"],
  en_preparacion: ["despachada", "entregada", "cancelada"],
  despachada: ["entregada", "completada", "cancelada"],
  entregada: ["completada"],
  completada: [],
  rechazada: [],
  cancelada: [],
};

export function puedeTransicionar(de, a) {
  if (de === a) return false;
  if (TERMINALES.has(de)) return false;
  return (TRANSICIONES[de] || []).includes(a);
}

export const METODOS_PAGO = ["efectivo", "transferencia", "tarjeta", "cheque", "otro"];
export const ESTADOS_PAGO = ["pendiente", "confirmado", "anulado"];
export const ESTADOS_ENTREGA = ["programada", "en_camino", "entregada", "fallida"];
export const ESTADOS_DEVOLUCION = ["pendiente", "aceptada", "rechazada", "reembolsada"];

function text(value, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
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

export function parsePago(body, { partial = false } = {}) {
  const errors = [];
  const data = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body ?? {}, key);

  if (!partial || has("monto")) {
    const monto = number(body?.monto);
    if (monto === null || monto <= 0) errors.push("El monto del pago debe ser mayor a 0.");
    else data.monto = monto;
  }
  if (has("metodo")) {
    const metodo = text(body?.metodo, 30) || "efectivo";
    if (!METODOS_PAGO.includes(metodo)) errors.push("Método de pago inválido.");
    else data.metodo = metodo;
  }
  if (has("estado")) {
    const estado = text(body?.estado, 30) || "confirmado";
    if (!ESTADOS_PAGO.includes(estado)) errors.push("Estado de pago inválido.");
    else data.estado = estado;
  }
  if (has("fecha")) data.fecha = fechaOrNull(body.fecha) ?? new Date();
  if (has("referencia")) data.referencia = text(body?.referencia, 120) || null;
  if (has("notas")) data.notas = text(body?.notas, 500) || null;
  return { data, errors };
}

export function parseEntrega(body, { partial = false } = {}) {
  const errors = [];
  const data = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body ?? {}, key);

  if (has("tipo")) {
    const tipo = text(body?.tipo, 30) || "entrega";
    if (!["despacho", "entrega"].includes(tipo)) errors.push("Tipo de entrega inválido.");
    else data.tipo = tipo;
  }
  if (has("estado")) {
    const estado = text(body?.estado, 30) || "programada";
    if (!ESTADOS_ENTREGA.includes(estado)) errors.push("Estado de entrega inválido.");
    else data.estado = estado;
  }
  if (has("fechaProgramada")) data.fechaProgramada = fechaOrNull(body.fechaProgramada);
  if (has("fechaReal")) data.fechaReal = fechaOrNull(body.fechaReal);
  if (has("transportista")) data.transportista = text(body?.transportista, 120) || null;
  if (has("guia")) data.guia = text(body?.guia, 80) || null;
  if (has("notas")) data.notas = text(body?.notas, 800) || null;
  return { data, errors };
}

export function parseDevolucion(body) {
  const errors = [];
  const motivo = text(body?.motivo, 500);
  if (!motivo) errors.push("El motivo de la devolución es obligatorio.");

  const estado = text(body?.estado, 30) || "pendiente";
  if (!ESTADOS_DEVOLUCION.includes(estado)) errors.push("Estado de devolución inválido.");

  const rawItems = Array.isArray(body?.items) ? body.items : [];
  const items = [];
  for (const raw of rawItems.slice(0, 50)) {
    const nombre = text(raw?.nombre, 200);
    const cantidad = number(raw?.cantidad);
    const precio = number(raw?.precio) ?? 0;
    if (!nombre || cantidad === null || cantidad <= 0) {
      errors.push("Cada item de la devolución necesita nombre y cantidad válida.");
      break;
    }
    items.push({
      ordenItemId: text(raw?.ordenItemId, 60) || null,
      nombre,
      cantidad: Math.round(cantidad),
      precio,
    });
  }

  const data = { motivo, estado, items };
  const monto = number(body?.monto);
  if (monto !== null && monto >= 0) data.monto = monto;
  else if (!items.length) data.monto = 0;
  else data.monto = items.reduce((sum, item) => sum + item.cantidad * item.precio, 0);

  return { data, errors };
}

export async function registrarEvento(tx, ordenId, { tipo, de = null, a = null, mensaje = null, actor = null } = {}) {
  return tx.ordenEvento.create({
    data: { ordenId, tipo, deEstado: de, aEstado: a, mensaje, actor },
  });
}

/** Resumen de pagos de una orden: pagado, saldo y último pago. */
export async function resumenPagos(ordenId) {
  const orden = await prisma.orden.findUnique({
    where: { id: ordenId },
    select: { monto: true, descuento: true },
  });
  if (!orden) return null;
  const pagos = await prisma.pago.findMany({
    where: { ordenId, estado: "confirmado" },
    orderBy: { fecha: "desc" },
  });
  const pagado = pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
  const total = Number(orden.monto) - Number(orden.descuento || 0);
  return {
    total,
    pagado,
    saldo: Math.max(0, total - pagado),
    pagadoParcial: pagado > 0 && pagado < total,
    pagadoTotal: pagado >= total && total > 0,
    cantidadPagos: pagos.length,
    ultimoPago: pagos[0] ?? null,
  };
}

/** Saldo global de ventas: facturado (monto) vs cobrado (pagos confirmados). */
export async function balanceVentas() {
  const [aggOrdenes, aggPagos] = await Promise.all([
    prisma.orden.aggregate({
      _sum: { monto: true },
      where: { tipo: "venta", estado: { notIn: ["cancelada", "rechazada"] } },
    }),
    prisma.pago.aggregate({
      _sum: { monto: true },
      where: { estado: "confirmado" },
    }),
  ]);
  const facturado = Number(aggOrdenes._sum.monto ?? 0);
  const cobrado = Number(aggPagos._sum.monto ?? 0);
  return { facturado, cobrado, saldo: Math.max(0, facturado - cobrado) };
}
