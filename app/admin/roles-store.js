import { apiFetch as fetch } from "@/lib/api-fetch";
import { slugify } from '@/lib/roles';

export const ROLE_STATUSES = [
  { id: "activo", label: "Activo" },
  { id: "inactivo", label: "Inactivo" },
];

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

export function newRolId() {
  return `rol-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function rolSlug(name) {
  return slugify(name);
}

export async function fetchRoles() {
  return api("/api/roles");
}

export async function createRol(rol) {
  return api("/api/roles", {
    method: "POST",
    body: JSON.stringify(rol),
  });
}

export async function updateRol(id, rol) {
  return api(`/api/roles/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(rol),
  });
}

export async function deleteRol(id) {
  return api(`/api/roles/${encodeURIComponent(id)}`, { method: "DELETE" });
}