import { MAX_DOCUMENT_AMOUNT, roundMoney } from "./ventas-form";

export const PURCHASE_TYPES = ["compra", "cotizacion"];
export const PURCHASE_TERMS = ["contado", "credito"];
export const PURCHASE_TAXES = [0, 15, 18];
export const MAX_PURCHASE_QUANTITY = 999999999;
export function strictNumber(value) {
  return typeof value === "number" ||
    (typeof value === "string" && value.trim())
    ? Number(value)
    : NaN;
}
export function purchaseTotals(items = []) {
  const subtotal = roundMoney(
    items.reduce(
      (sum, item) =>
        sum +
        roundMoney(
          (Number(item.cantidad) || 0) * (Number(item.costoUnitario) || 0),
        ),
      0,
    ),
  );
  const impuesto = roundMoney(
    items.reduce(
      (sum, item) =>
        sum +
        roundMoney(
          (roundMoney(
            (Number(item.cantidad) || 0) * (Number(item.costoUnitario) || 0),
          ) *
            (Number(item.impuestoPorcentaje) || 0)) /
            100,
        ),
      0,
    ),
  );
  return { subtotal, impuesto, total: roundMoney(subtotal + impuesto) };
}
export function validPurchaseLine(item) {
  const quantity = strictNumber(item.cantidad),
    cost = strictNumber(item.costoUnitario),
    tax = strictNumber(item.impuestoPorcentaje ?? 0);
  return Boolean(
    item.nombre?.trim() &&
      Number.isInteger(quantity) &&
      quantity > 0 &&
      quantity <= MAX_PURCHASE_QUANTITY &&
      Number.isFinite(cost) &&
      cost >= 0 &&
      cost <= MAX_DOCUMENT_AMOUNT &&
      Math.abs(cost - roundMoney(cost)) <=
        Number.EPSILON * Math.max(1, cost) * 4 &&
      PURCHASE_TAXES.includes(tax),
  );
}
export function warehouseStatus(order) {
  if (order.tipo === "cotizacion") return "No aplica";
  if (order.estado === "cancelada")
    return order.items?.some((item) => item.cantidadRecibida > 0)
      ? "Saldo cancelado; recepción conservada"
      : "Cancelada sin recepción";
  if (
    order.items?.length &&
    order.items.every((item) => item.cantidadRecibida >= item.cantidad)
  )
    return "Recibida";
  return order.items?.some((item) => item.cantidadRecibida > 0)
    ? "Recibida parcialmente"
    : "Pendiente de recibir";
}
export function paymentTerms(order) {
  return order.terminos === "credito"
    ? `Crédito ${order.diasCredito} días`
    : "Contado / efectivo";
}
export function purchaseDate(value) {
  return value
    ? (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10)
    : "";
}

export function samePurchaseFigures(before = [], after = []) {
  if (before.length !== after.length) return false;
  const signature = (items) =>
    items
      .map((item) =>
        JSON.stringify([
          item.productoId || null,
          Number(item.cantidad),
          Number(item.costoUnitario),
          Number(item.impuestoPorcentaje || 0),
        ]),
      )
      .sort();
  const left = signature(before),
    right = signature(after);
  return left.every((item, index) => item === right[index]);
}

export function businessPurchaseDate(now = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: "America/Tegucigalpa" });
}
