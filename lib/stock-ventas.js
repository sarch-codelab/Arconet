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
  if (!Number.isFinite(numero)) return 0;
  return Math.round(numero);
}

/** ¿Esta venta ya descontó inventario? */
export async function tieneSalidas(tx, referencia) {
  const salida = await tx.movimientoKardex.findFirst({
    where: { referencia, tipo: "salida" },
    select: { id: true },
  });
  return Boolean(salida);
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
  const bodega = await bodegaPrincipal(tx);
  let movimientos = 0;

  for (const item of Array.isArray(items) ? items : []) {
    if (!item?.productoId) continue;
    const cantidad = cantidadStock(item.cantidad);
    if (cantidad <= 0) continue;
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
 * Devuelve al inventario lo que descontó una venta o factura. Si ya se
 * revirtió, no hace nada (idempotente).
 */
export async function revertirStock(
  tx,
  { referencia, actor = null, motivo = "Reverso por anulación" }
) {
  const salidas = await tx.movimientoKardex.findMany({
    where: { referencia, tipo: "salida" },
    select: { productoId: true, bodegaId: true, cantidad: true, ordenId: true },
  });
  if (!salidas.length) return { revertidos: 0 };

  const yaRevertido = await tx.movimientoKardex.findFirst({
    where: { referencia: `reverso:${referencia}` },
    select: { id: true },
  });
  if (yaRevertido) return { revertidos: 0, yaRevertido: true };

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
