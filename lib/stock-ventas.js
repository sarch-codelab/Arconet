// Puente entre ventas/facturas y el kardex.
//
// Regla del negocio: el inventario sale cuando se emite la venta o la factura
// y vuelve si se anula. Cada operación usa una referencia estable para poder
// revertirse sin duplicar movimientos:
//   venta:<ordenId>   → salidas de una venta
//   factura:<docId>   → salidas de una factura fiscal sin orden previa
//   reverso:<ref>     → entradas que devuelven esas salidas

import { aplicarMovimiento, bodegaPrincipal } from "./inventario";

function cantidadStock(value) {
  const numero = Number(value);
  if (!Number.isInteger(numero) || numero <= 0) {
    const error = new Error("Los productos de catálogo requieren cantidades enteras mayores que cero.");
    error.status = 400;
    throw error;
  }
  return numero;
}

export function isStockSale(order) {
  return order.tipo === "venta" && !["cancelada", "rechazada"].includes(order.estado);
}

// Un reverso histórico no cancela las salidas de ediciones posteriores.
// Se calcula lo pendiente por producto/bodega bajo el mismo bloqueo de referencia
// tanto para consultar como para devolver; la transacción conserva el bloqueo.
async function salidasPendientes(tx, referencia) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`stock-ref-${referencia}`}))`;
  const select = { productoId: true, bodegaId: true, cantidad: true, ordenId: true };
  const salidas = await tx.movimientoKardex.findMany({ where: { referencia, tipo: "salida" }, select });
  if (!salidas.length) return [];
  const reversos = await tx.movimientoKardex.findMany({ where: { referencia: `reverso:${referencia}`, tipo: "entrada" }, select });
  const pendientes = new Map();
  const key = item => JSON.stringify([item.productoId, item.bodegaId]);
  for (const salida of salidas) {
    const id = key(salida);
    const actual = pendientes.get(id) || { ...salida, cantidad: 0 };
    actual.cantidad += Math.abs(Number(salida.cantidad));
    pendientes.set(id, actual);
  }
  for (const reverso of reversos) {
    const actual = pendientes.get(key(reverso));
    if (actual) actual.cantidad -= Math.abs(Number(reverso.cantidad));
  }
  return [...pendientes.values()].filter(item => item.cantidad > 0);
}

/** ¿Queda inventario descontado, no compensado por reversos? */
export async function tieneSalidas(tx, referencia) {
  return (await salidasPendientes(tx, referencia)).length > 0;
}

/**
 * Registra la salida de cada línea con producto. Las líneas sin producto
 * (servicios o conceptos libres) no afectan el inventario.
 * Debe ejecutarse dentro de una transacción.
 */
export async function descontarStock(
  tx,
  { referencia, items, actor = null, ordenId = null, motivo = null }
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`stock-ref-${referencia}`}))`;
  const bodega = await bodegaPrincipal(tx);
  let movimientos = 0;

  for (const item of Array.isArray(items) ? items : []) {
    if (!item?.productoId) continue;
    const cantidad = cantidadStock(item.cantidad);
    await aplicarMovimiento(tx, {
      tipo: "salida",
      productoId: item.productoId,
      bodegaId: bodega.id,
      cantidad,
      referencia,
      motivo: motivo || `Salida por venta (${referencia})`,
      ordenId,
      actor,
    });
    movimientos += 1;
  }

  return { bodegaId: bodega.id, movimientos };
}

/**
 * Devuelve solo el saldo neto pendiente de una venta o factura, incluso
 * tras varias ediciones. Sin saldo pendiente no genera entradas (idempotente).
 */
export async function revertirStock(
  tx,
  { referencia, actor = null, motivo = "Reverso por anulación" }
) {
  const salidas = await salidasPendientes(tx, referencia);
  if (!salidas.length) return { revertidos: 0 };

  for (const salida of salidas) {
    await aplicarMovimiento(tx, {
      tipo: "entrada",
      productoId: salida.productoId,
      bodegaId: salida.bodegaId,
      cantidad: salida.cantidad,
      referencia: `reverso:${referencia}`,
      motivo,
      ordenId: salida.ordenId,
      actor,
    });
  }

  return { revertidos: salidas.length };
}
