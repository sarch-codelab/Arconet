import { nanoid } from "nanoid";

export const CLIENT_STATUSES = [
  { id: "activo", label: "Activo" },
  { id: "inactivo", label: "Inactivo" },
  { id: "prospecto", label: "Prospecto" },
];

export function newClienteId() {
  return `c-${nanoid(8)}`;
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

export async function fetchClientes() {
  return api("/api/clientes");
}

export async function createCliente(cliente) {
  return api("/api/clientes", { method: "POST", body: JSON.stringify(cliente) });
}

export async function updateCliente(id, cliente) {
  return api(`/api/clientes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(cliente),
  });
}

export async function deleteCliente(id) {
  return api(`/api/clientes/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function clientStatusLabel(statusId) {
  const status = CLIENT_STATUSES.find((item) => item.id === statusId);
  return status ? status.label : statusId;
}

export function initialsCliente(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}
