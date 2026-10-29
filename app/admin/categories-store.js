import { apiFetch as fetch } from "@/lib/api-fetch";
import { slugify } from '@/lib/categorias';

export const CATEGORY_STATUSES = [
  { id: "activo", label: "Activa" },
  { id: "inactivo", label: "Inactiva" },
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

export function newCategoryId() {
  return `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function categorySlug(name) {
  return slugify(name);
}

export async function fetchCategorias() {
  return api("/api/categorias");
}

export async function createCategoria(categoria) {
  return api("/api/categorias", {
    method: "POST",
    body: JSON.stringify(categoria),
  });
}

export async function updateCategoria(id, categoria) {
  return api(`/api/categorias/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(categoria),
  });
}

export async function deleteCategoria(id) {
  return api(`/api/categorias/${encodeURIComponent(id)}`, { method: "DELETE" });
}
