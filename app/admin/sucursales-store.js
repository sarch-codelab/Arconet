import { apiFetch as fetch } from "@/lib/api-fetch";
import { nanoid } from "nanoid";

export const BRANCHES = [
  { id: "sps", label: "San Pedro Sula" },
  { id: "la-ceiba", label: "La Ceiba" },
  { id: "ceiba", label: "Ceiba" },
];

export function newSucursalId() {
  return `b-${nanoid(8)}`;
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

export async function fetchSucursales() {
  return api("/api/sucursales");
}

export async function createSucursal(sucursal) {
  return api("/api/sucursales", { method: "POST", body: JSON.stringify(sucursal) });
}

export async function updateSucursal(id, sucursal) {
  return api(`/api/sucursales/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(sucursal),
  });
}

export async function deleteSucursal(id) {
  return api(`/api/sucursales/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function initialsSucursal(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}
