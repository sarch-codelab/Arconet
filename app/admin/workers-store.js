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

export const ADMIN_CREDENTIALS = {
  email: "admin@arconet.com",
  password: "arconet2026",
};

const WORKERS_KEY = "arconet-workers";
const SEED_KEY = "arconet-workers-seed";
const SESSION_KEY = "arconet-admin-session";
const SEED_VERSION = "1";

const SEED = [
  {
    id: "w-seed-01",
    nombre: "Karla Mendoza",
    puesto: "Gerente de Sucursal",
    correo: "karla.mendoza@arconet.com",
    telefono: "+504 9987-1200",
    sucursal: "sps",
    rol: "gerente",
    estado: "activo",
    ingreso: "2019-03-04",
    foto: "",
  },
  {
    id: "w-seed-02",
    nombre: "Oscar Reyes",
    puesto: "Técnico de Fibra Óptica",
    correo: "oscar.reyes@arconet.com",
    telefono: "+504 9455-3312",
    sucursal: "sps",
    rol: "tecnico",
    estado: "activo",
    ingreso: "2021-07-19",
    foto: "",
  },
  {
    id: "w-seed-03",
    nombre: "Daniela Cruz",
    puesto: "Ejecutiva de Ventas",
    correo: "daniela.cruz@arconet.com",
    telefono: "+504 8811-7742",
    sucursal: "la-ceiba",
    rol: "ventas",
    estado: "activo",
    ingreso: "2022-01-10",
    foto: "",
  },
  {
    id: "w-seed-04",
    nombre: "Marvin Lobo",
    puesto: "Encargado de Bodega",
    correo: "marvin.lobo@arconet.com",
    telefono: "+504 9912-8845",
    sucursal: "la-ceiba",
    rol: "bodega",
    estado: "vacaciones",
    ingreso: "2020-11-02",
    foto: "",
  },
  {
    id: "w-seed-05",
    nombre: "Sofía Aguilar",
    puesto: "Administradora General",
    correo: "sofia.aguilar@arconet.com",
    telefono: "+504 9900-1122",
    sucursal: "sps",
    rol: "administrador",
    estado: "activo",
    ingreso: "2017-05-22",
    foto: "",
  },
  {
    id: "w-seed-06",
    nombre: "Jorge Zelaya",
    puesto: "Técnico CATV",
    correo: "jorge.zelaya@arconet.com",
    telefono: "+504 9333-2210",
    sucursal: "la-ceiba",
    rol: "tecnico",
    estado: "activo",
    ingreso: "2023-02-14",
    foto: "",
  },
  {
    id: "w-seed-07",
    nombre: "Génesis Flores",
    puesto: "Asistente Administrativa",
    correo: "genesis.flores@arconet.com",
    telefono: "+504 9777-6655",
    sucursal: "sps",
    rol: "administrador",
    estado: "inactivo",
    ingreso: "2021-09-30",
    foto: "",
  },
  {
    id: "w-seed-08",
    nombre: "Edwin Paredes",
    puesto: "Ejecutivo de Ventas",
    correo: "edwin.paredes@arconet.com",
    telefono: "+504 8622-9090",
    sucursal: "sps",
    rol: "ventas",
    estado: "activo",
    ingreso: "2024-04-08",
    foto: "",
  },
];

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
  if (!canUseStorage()) return SEED.map((worker) => ({ ...worker }));
  try {
    const version = window.localStorage.getItem(SEED_KEY);
    const raw = window.localStorage.getItem(WORKERS_KEY);
    if (!raw || version !== SEED_VERSION) {
      window.localStorage.setItem(WORKERS_KEY, JSON.stringify(SEED));
      window.localStorage.setItem(SEED_KEY, SEED_VERSION);
      return SEED.map((worker) => ({ ...worker }));
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("formato inválido");
    return parsed;
  } catch {
    return SEED.map((worker) => ({ ...worker }));
  }
}

export function saveWorkers(workers) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(WORKERS_KEY, JSON.stringify(workers));
  } catch {}
}

export function loadSession() {
  if (!canUseStorage()) return null;
  try {
    const raw =
      window.localStorage.getItem(SESSION_KEY) ||
      window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.correo) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(user, remember) {
  if (!canUseStorage()) return;
  try {
    const payload = JSON.stringify(user);
    if (remember) {
      window.localStorage.setItem(SESSION_KEY, payload);
      window.sessionStorage.removeItem(SESSION_KEY);
    } else {
      window.sessionStorage.setItem(SESSION_KEY, payload);
      window.localStorage.removeItem(SESSION_KEY);
    }
  } catch {}
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
    if (response.status === 401) {
      return null;
    }
  } catch {}
  if (normalized === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
    return {
      nombre: "Sofía Aguilar",
      correo: ADMIN_CREDENTIALS.email,
      rol: "administrador",
      sucursal: "sps",
    };
  }
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
