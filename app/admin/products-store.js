import { apiFetch as fetch } from "@/lib/api-fetch";
export const PRODUCT_CATEGORIES = [
  "Soluciones de Preconectorizado",
  "Herrajes",
  "Gabinetes y Racks",
  "Cajas de Distribución y Emplazamiento",
  "Soluciones activas y Accesorios FTTH",
  "Herramientas y kits",
  "Escaleras",
  "Optical Distribution Frame - ODF",
  "Instrumentos de medición óptica",
  "Componentes pasivos",
  "Microcables y Microproductos",
];

export const PRODUCT_UNITS = ["Unidad", "Pieza", "Par", "Metro", "Rollo", "Caja"];

const UNIT_PLURALS = {
  Unidad: "Unidades",
  Pieza: "Piezas",
  Par: "Pares",
  Metro: "Metros",
  Rollo: "Rollos",
  Caja: "Cajas",
};

export const PRODUCT_STATUSES = [
  { id: "activo", label: "Activo" },
  { id: "borrador", label: "Borrador" },
  { id: "inactivo", label: "Inactivo" },
];

export function newProductId() {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function api(path, options) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Error ${response.status}`);
  }
  return response.json();
}

export async function fetchProducts() {
  return api("/api/productos");
}

export async function createProduct(product) {
  return api("/api/productos", {
    method: "POST",
    body: JSON.stringify(product),
  });
}

export async function updateProduct(id, product) {
  return api(`/api/productos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(product),
  });
}

export async function deleteProduct(id) {
  return api(`/api/productos/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function formatPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return `L ${amount.toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function unitLabel(unit, quantity = 0) {
  const singular = String(unit || "Unidad").trim() || "Unidad";
  const plural = UNIT_PLURALS[singular] || `${singular}s`;
  return (Number(quantity) === 1 ? singular : plural).toLowerCase();
}

export function formatStock(quantity, unit) {
  const amount = Number(quantity) || 0;
  return `${amount} ${unitLabel(unit, amount)}`;
}

export function productInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "··";
  const first = parts[0][0] || "";
  const second = parts.length > 1 ? parts[1][0] || "" : "";
  return (first + second).toUpperCase();
}
