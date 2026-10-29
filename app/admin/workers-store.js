import { rememberLocalPreviewSession, clearLocalPreviewSession, apiFetch as fetch } from "@/lib/api-fetch";
export const BRANCHES = [
  { id: "sps", label: "San Pedro Sula" },
  { id: "la-ceiba", label: "La Ceiba" },
];

export const STATUSES = [
  { id: "activo", label: "Activo" },
  { id: "vacaciones", label: "Vacaciones" },
  { id: "inactivo", label: "Inactivo" },
];

const SESSION_KEY = "arconet-admin-session";

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function newWorkerId() {
  return `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
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

export async function fetchWorkers() {
  return api("/api/trabajadores");
}

export async function createWorker(worker) {
  return api("/api/trabajadores", { method: "POST", body: JSON.stringify(worker) });
}

export async function updateWorker(id, worker) {
  return api(`/api/trabajadores/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(worker),
  });
}

export async function deleteWorker(id) {
  return api(`/api/trabajadores/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function loadWorkers() {
  return [];
}

export function clearSession() {
  clearLocalPreviewSession("admin");
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

export async function authenticate(email, password, codigo = "") {
  if (!email || !password) return null;
  const normalized = email.trim().toLowerCase();
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalized, password, ...(codigo ? { codigo } : {}) }),
    });
    if (response.ok) {
      const { localPreviewToken, ...user } = await response.json();
      rememberLocalPreviewSession("admin", localPreviewToken);
      if (localPreviewToken) {
        const check = await fetch("/api/local-preview/session", { cache: "no-store" });
        if (!check.ok) {
          clearLocalPreviewSession("admin");
          throw new Error("Los datos son correctos, pero la vista previa no conserva la sesión. Recarga la vista previa e inténtalo de nuevo.");
        }
      }
      return user;
    }
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "No se pudo iniciar sesión.");
  } catch (error) {
    throw new Error(error.message || "No se pudo conectar al servidor.");
  }
}

export function branchLabel(id, catalog = BRANCHES) {
  const branch = catalog.find(item => item.id === id) || BRANCHES.find(item => item.id === id);
  return branch?.label || branch?.nombre || id;
}

export function statusLabel(id) {
  return STATUSES.find((status) => status.id === id)?.label || id;
}

export function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "··";
  const first = parts[0][0] || "";
  const second = parts.length > 1 ? parts[parts.length - 1][0] || "" : "";
  return (first + second).toUpperCase();
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
