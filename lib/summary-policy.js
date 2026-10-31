import { canReadScopedSummary } from "./permisos";

export function summaryScope(permisos = []) {
  const has = permission => Array.isArray(permisos) && permisos.includes(permission);
  return {
    allowed: canReadScopedSummary(permisos),
    reports: has("reportes:read"), commercial: has("ordenes:read"), fiscal: has("facturacion:read"),
    inventory: has("inventario:read"), products: has("productos:read"), prices: has("precios:read"),
    workers: has("trabajadores:read"), branches: has("sucursales:read"), customers: has("clientes:read"),
    purchases: has("compras:read"), categories: has("categorias:read"), roles: has("roles:read"),
    requests: has("solicitudes:read"), logs: has("logs:read"), monitor: has("monitoreo:read"), settings: has("ajustes:read"),
  };
}

// Alias monetario de lempiras; otras monedas nunca se convierten ni se suman
// a HNL. Map evita usar códigos importados como propiedades de un objeto.
export function summaryCurrency(value) {
  const code = String(value || "HNL").trim().toUpperCase();
  return ["L", "LPS", "HNL"].includes(code) ? "HNL" : code;
}
export function moneyCents(value = 0) {
  const text = value == null ? "0" : typeof value.toFixed === "function" ? value.toFixed(2) : String(value);
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(text)) throw new Error("Importe agregado inválido.");
  const negative = text.startsWith("-");
  const [integer, fraction = ""] = text.replace(/^-/, "").split(".");
  return (BigInt(integer) * 100n + BigInt(fraction.padEnd(2, "0"))) * (negative ? -1n : 1n);
}
export function centsMoney(cents) {
  const amount = cents < 0n ? -cents : cents;
  return `${cents < 0n ? "-" : ""}${amount / 100n}.${String(amount % 100n).padStart(2, "0")}`;
}
export function formatSummaryMoney(value, currency = "HNL") {
  const cents = moneyCents(value), amount = cents < 0n ? -cents : cents;
  const code = summaryCurrency(currency);
  const symbol = ({ HNL: "L", USD: "US$", EUR: "€" })[code] || code;
  return `${cents < 0n ? "−" : ""}${symbol} ${(amount / 100n).toLocaleString("es-HN")}.${String(amount % 100n).padStart(2, "0")}`;
}

// `legacy` ya excluye los históricos reemplazados por una factura activa
// cuando ambas fuentes están autorizadas. Las notas ajustan el importe,
// nunca se cuentan como ventas adicionales. Anulados no participan.
export function summarizeSalesAggregates({ legacy, fiscal = [], financial = false }) {
  const totals = new Map();
  const add = (currency, cents) => totals.set(currency, (totals.get(currency) || 0n) + cents);
  let invoices = 0, cancelled = 0, credits = 0, debits = 0;
  for (const row of fiscal) {
    const count = Number(row._count?._all || 0);
    if (row.estado === "anulado") { if (row.tipo === "factura") cancelled += count; continue; }
    if (row.tipo === "factura") invoices += count;
    else if (row.tipo === "nota_credito") credits += count;
    else if (row.tipo === "nota_debito") debits += count;
    else continue;
    if (financial) add(summaryCurrency(row.moneda), moneyCents(row._sum?.total) * (row.tipo === "nota_credito" ? -1n : 1n));
  }
  if (financial && legacy && (legacy.count || moneyCents(legacy.amount))) add("HNL", moneyCents(legacy.amount));
  if (financial && !totals.size) add("HNL", 0n);
  return {
    sales: Number(legacy?.count || 0) + invoices, invoices, cancelled, credits, debits,
    ...(financial ? { amounts: [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([currency, amount]) => ({ currency, amount: centsMoney(amount) })) } : {}),
  };
}

export function summaryLinks(scope) {
  const links = [];
  const add = (id, label, target = id) => links.push({ id, label, target });
  if (scope.commercial || scope.fiscal) add("ventas", "Ventas y documentos");
  if (scope.customers) add("clientes", "Clientes");
  if (scope.inventory) add("inventario", "Inventario");
  if (scope.products) add("productos", "Catálogo de productos");
  if (scope.prices && !scope.commercial && !scope.fiscal) add("precios", "Precios de venta", "ventas");
  if (scope.purchases) add("compras", "Compras a proveedores");
  if (scope.requests) add("solicitudes", "Órdenes internas");
  if (scope.workers) add("trabajadores", "Personal");
  if (scope.branches) add("sucursales", "Sucursales");
  if (scope.categories) add("categorias", "Categorías");
  if (scope.roles) add("roles", "Roles y permisos");
  if (scope.logs) add("logs", "Bitácora global");
  else if (scope.inventory) add("logs", "Registros de Inventario");
  if (scope.monitor) add("monitoreo", "Monitoreo");
  if (scope.settings) add("ajustes", "Ajustes");
  add("mi-perfil", "Mi perfil");
  return links;
}

export function summaryTargetUrl(target) {
  if (["productos", "compras"].includes(target)) return `/panel-administrativo?section=inventario&view=${target}`;
  return `/panel-administrativo?section=${encodeURIComponent(target)}`;
}
