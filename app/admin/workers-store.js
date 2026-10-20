export const BRANCHES = [
  { id: "sps", label: "San Pedro Sula" },
  { id: "la-ceiba", label: "La Ceiba" },
];

export const ROLES = [
  { id: "administrador", label: "Administrador" },
  { id: "gerente", label: "Gerente" },
  { id: "tecnico", label: "Técnico" },
  { id: "ventas", label: "Ventas" },
  { id: "bodega", label: "Bodega" },
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
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

export async function authenticate(email, password) {
  if (!email || !password) return null;
  const normalized = email.trim().toLowerCase();
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalized, password }),
    });
    if (response.ok) {
      return await response.json();
    }
  } catch {}
  return null;
}

export function branchLabel(id) {
  return BRANCHES.find((branch) => branch.id === id)?.label || id;
}

export function roleLabel(id) {
  return ROLES.find((role) => role.id === id)?.label || id;
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
