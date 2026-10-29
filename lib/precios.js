// Tarifas del catálogo. Compartido por formularios y validación del servidor.
export const PRICE_FIELDS = ["precio", "precioDescuento", "precioMayorista"];
export const PRICE_LEVELS = [
  { id: "normal", field: "precio", label: "Valor 1 · Normal" },
  { id: "descuento", field: "precioDescuento", label: "Valor 2 · Descuento" },
  { id: "mayorista", field: "precioMayorista", label: "Valor 3 · Mayorista" },
];
export const hasPriceChanges = (body) =>
  PRICE_FIELDS.some((field) => Object.hasOwn(body || {}, field));
export const priceLevel = (id) => PRICE_LEVELS.find((level) => level.id === id);
export function priceAt(product, level = "normal") {
  const field = priceLevel(level)?.field;
  const value = field ? product?.[field] : null;
  return value == null || value === "" ? null : Number(value);
}
export function parsePrices(body) {
  const data = {},
    errors = [];
  for (const { field, label } of PRICE_LEVELS) {
    if (!Object.hasOwn(body || {}, field)) continue;
    const raw = body[field];
    if (field !== "precio" && (raw == null || raw === "")) {
      data[field] = null;
      continue;
    }
    const value =
      typeof raw === "number" || (typeof raw === "string" && raw.trim())
        ? Number(raw)
        : NaN;
    const minimum = field === "precio" ? 1 : 0.01;
    if (
      !Number.isFinite(value) ||
      value < minimum ||
      value > 9999999999.99 ||
      Math.abs(value - Math.round(value * 100) / 100) >
        Number.EPSILON * Math.max(1, Math.abs(value)) * 4
    ) {
      errors.push(
        `${label}: ingresa un importe válido, con máximo dos decimales y mínimo L ${minimum.toFixed(2)}.`,
      );
    } else data[field] = Math.round(value * 100) / 100;
  }
  return { data, errors };
}
export function validatePriceSet(product) {
  const { errors } = parsePrices(product);
  for (const { field, label } of PRICE_LEVELS.slice(1)) {
    if (
      product[field] != null &&
      Number(product[field]) > Number(product.precio)
    )
      errors.push(`${label} no puede superar el Valor 1 · Normal.`);
  }
  return errors;
}
export function priceSnapshot(product) {
  return Object.fromEntries(
    PRICE_FIELDS.map((field) => [
      field,
      product[field] == null ? null : Number(product[field]),
    ]),
  );
}
