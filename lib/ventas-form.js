// Helpers puros compartidos por los formularios comerciales y sus APIs.
export const MAX_DOCUMENT_AMOUNT = 9999999999.99;
export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function commercialTotal(items = []) {
  return roundMoney(items.reduce((total, item) => {
    const amount = Number(item.cantidad) * Number(item.precio);
    return total + (Number.isFinite(amount) ? roundMoney(amount) : 0);
  }, 0));
}

export function checkedCommercialTotal(items) {
  const total = commercialTotal(items);
  if (!Number.isFinite(total) || total > MAX_DOCUMENT_AMOUNT) {
    const error = new Error("El total supera el importe máximo permitido. Reduce cantidades o precios.");
    error.status = 400;
    throw error;
  }
  return total;
}

export function sameCommercialAmounts(previous = [], next = []) {
  if (previous.length !== next.length) return false;
  // El orden y la descripción no son cambios financieros. No agregamos las
  // líneas: dividir un concepto puede cambiar su redondeo por línea.
  const amounts = items => items.map(line => JSON.stringify([line.productoId || null, Number(line.cantidad), Number(line.precio)])).sort();
  const before = amounts(previous), after = amounts(next);
  return before.every((amount, index) => amount === after[index]);
}

export function sameCatalogQuantities(previous = [], next = []) {
  const quantities = items => {
    const result = new Map();
    for (const line of items) if (line.productoId) result.set(line.productoId, (result.get(line.productoId) || 0) + Number(line.cantidad));
    return result;
  };
  const before = quantities(previous), after = quantities(next);
  return before.size === after.size && [...before].every(([id, quantity]) => after.get(id) === quantity);
}

// Igual que el cálculo fiscal del servidor: redondear base e ISV por línea,
// no solamente el gran total (importante para conceptos fraccionarios).
export function fiscalPreviewTotals(items = []) {
  let subtotal = 0, descuento = 0, impuesto = 0;
  for (const item of items) {
    const base = roundMoney(Math.max(0, (Number(item.cantidad) || 0) * (Number(item.precio) || 0) - (Number(item.descuento) || 0)));
    subtotal += base;
    descuento += Number(item.descuento) || 0;
    impuesto += roundMoney(base * (Number(item.impuestoPorcentaje) || 0) / 100);
  }
  return { subtotal: roundMoney(subtotal), descuento: roundMoney(descuento), impuesto: roundMoney(impuesto), total: roundMoney(subtotal + impuesto) };
}

export function validCommercialLine(line) {
  const quantity = Number(line.cantidad), price = Number(line.precio);
  return Boolean(
    typeof line.nombre === "string" && line.nombre.trim() &&
    (line.kind !== "producto" || line.productoId) &&
    (typeof line.cantidad === "number" || (typeof line.cantidad === "string" && line.cantidad.trim())) && Number.isFinite(quantity) && quantity > 0 && quantity <= 999999999.999 &&
    (!line.productoId || Number.isInteger(quantity)) &&
    Math.abs(quantity - Math.round(quantity * 1000) / 1000) <= Number.EPSILON * Math.max(1, Math.abs(quantity)) * 4 &&
    (typeof line.precio === "number" || (typeof line.precio === "string" && line.precio.trim())) && Number.isFinite(price) && price >= 0 && price <= MAX_DOCUMENT_AMOUNT &&
    Math.abs(price - roundMoney(price)) <= Number.EPSILON * Math.max(1, Math.abs(price)) * 4
  );
}

export function lookupTerms(query) {
  return String(query || "").trim().slice(0, 100).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .split(/\s+/).filter(Boolean).slice(0, 10);
}

export function clientIdentity(client) {
  if (!client) return "";
  return [
    client.rtn ? `ID / RTN: ${client.rtn}` : "Sin identificación registrada",
    client.telefono || client.correo || `Ref. ${client.id}`,
    client.estado === "inactivo" ? "Inactivo" : "",
  ].filter(Boolean).join(" · ");
}
