import { nanoid } from "nanoid";

export const ORDER_STATUSES = [
  { id: "pendiente", label: "Pendiente" },
  { id: "en_proceso", label: "En proceso" },
  { id: "aprobada", label: "Aprobada" },
  { id: "rechazada", label: "Rechazada" },
  { id: "completada", label: "Completada" },
  { id: "cancelada", label: "Cancelada" },
];

export const ORDER_TYPES = [
  { id: "cotizacion", label: "Cotización" },
  { id: "venta", label: "Venta" },
];

export function newOrderId() {
  return `o-${nanoid(8)}`;
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

export async function fetchOrders() {
  return api("/api/ordenes");
}

export async function createOrder(order) {
  return api("/api/ordenes", { method: "POST", body: JSON.stringify(order) });
}

export async function updateOrder(id, order) {
  return api(`/api/ordenes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(order),
  });
}

export async function deleteOrder(id) {
  return api(`/api/ordenes/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function orderStatusLabel(statusId) {
  return ORDER_STATUSES.find((item) => item.id === statusId)?.label || statusId;
}

export function orderTypeLabel(typeId) {
  return ORDER_TYPES.find((item) => item.id === typeId)?.label || typeId;
}

export function formatOrderDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("es-HN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
